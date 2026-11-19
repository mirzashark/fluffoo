import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/database.js';
import { generateToken, authenticateToken, requireStaffRole } from '../middleware/auth.js';

const router = express.Router();

// --- Customer Authentication ---

// Register customer
router.post('/customer/register', (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, error: 'Name, phone number, and password are required.' });
    }

    if (email) {
      const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(email);
      if (existing) {
        return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
      }
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO customers (name, email, phone, password_hash)
      VALUES (?, ?, ?, ?)
    `).run(name, email || null, phone, passwordHash);

    const token = generateToken({ id: result.lastInsertRowid, type: 'customer', name, email });
    res.status(201).json({
      success: true,
      token,
      customer: { id: result.lastInsertRowid, name, email, phone }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login customer
router.post('/customer/login', (req, res) => {
  try {
    const { identifier, password } = req.body; // email or phone
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Email/phone and password are required.' });
    }

    const customer = db.prepare(`
      SELECT * FROM customers WHERE email = ? OR phone = ?
    `).get(identifier, identifier);

    if (!customer || !customer.password_hash) {
      return res.status(401).json({ success: false, error: 'Invalid email/phone or password.' });
    }

    const valid = bcrypt.compareSync(password, customer.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid email/phone or password.' });
    }

    const token = generateToken({ id: customer.id, type: 'customer', name: customer.name, email: customer.email });
    res.json({
      success: true,
      token,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get customer profile
router.get('/customer/profile', authenticateToken, (req, res) => {
  try {
    if (req.user.type !== 'customer') {
      return res.status(403).json({ success: false, error: 'Not a customer account.' });
    }
    const customer = db.prepare('SELECT id, name, email, phone, created_at FROM customers WHERE id = ?').get(req.user.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }
    const addresses = db.prepare('SELECT * FROM addresses WHERE customer_id = ?').all(req.user.id);
    res.json({ success: true, customer, addresses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Admin / Staff Authentication ---

// Staff Login
router.post('/staff/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const staff = db.prepare('SELECT * FROM staff WHERE email = ? AND is_active = 1').get(email);
    if (!staff) {
      return res.status(401).json({ success: false, error: 'Invalid staff email or password.' });
    }

    const valid = bcrypt.compareSync(password, staff.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid staff email or password.' });
    }

    const token = generateToken({
      id: staff.id,
      type: 'staff',
      name: staff.name,
      email: staff.email,
      role: staff.role
    }, '24h');

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (staff_id, action, entity, entity_id, details)
      VALUES (?, 'LOGIN', 'staff', ?, 'Staff logged into admin portal')
    `).run(staff.id, staff.id.toString());

    res.json({
      success: true,
      token,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify staff token
router.get('/staff/me', authenticateToken, (req, res) => {
  if (req.user.type !== 'staff') {
    return res.status(403).json({ success: false, error: 'Not an authorized staff member.' });
  }
  const staff = db.prepare('SELECT id, name, email, role, is_active FROM staff WHERE id = ?').get(req.user.id);
  if (!staff || !staff.is_active) {
    return res.status(403).json({ success: false, error: 'Account disabled or not found.' });
  }
  res.json({ success: true, staff });
});

// List all staff (Super Admin only)
router.get('/staff', authenticateToken, requireStaffRole('super_admin'), (req, res) => {
  try {
    const staffList = db.prepare('SELECT id, name, email, role, is_active, created_at FROM staff ORDER BY id ASC').all();
    res.json({ success: true, staff: staffList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create staff account (Super Admin only)
router.post('/staff', authenticateToken, requireStaffRole('super_admin'), (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }
    const validRoles = ['super_admin', 'order_manager', 'product_manager', 'payment_manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: `Role must be one of: ${validRoles.join(', ')}` });
    }

    const existing = db.prepare('SELECT id FROM staff WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Staff email already registered.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO staff (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `).run(name, email, hash, role);

    res.status(201).json({
      success: true,
      staff: { id: result.lastInsertRowid, name, email, role }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
