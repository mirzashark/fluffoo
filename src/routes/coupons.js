import express from 'express';
import db from '../db/database.js';
import { authenticateToken, requireStaffRole } from '../middleware/auth.js';

const router = express.Router();

// Public: Validate coupon at checkout
router.post('/validate', (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Coupon code is required.' });
    }

    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(code.trim().toUpperCase());
    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Invalid or expired coupon code.' });
    }

    if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
      return res.status(400).json({ success: false, error: 'This coupon has reached its maximum usage limit.' });
    }

    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      return res.status(400).json({ success: false, error: 'This coupon has expired.' });
    }

    const orderSubtotal = Number(subtotal || 0);
    if (coupon.min_order_value && orderSubtotal < coupon.min_order_value) {
      return res.status(400).json({
        success: false,
        error: `Minimum order value for coupon ${coupon.code} is Rs. ${coupon.min_order_value.toLocaleString()}.`
      });
    }

    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = (orderSubtotal * coupon.discount_value) / 100;
      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }
    } else {
      discount = coupon.discount_value;
    }

    if (discount > orderSubtotal) discount = orderSubtotal;

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        calculated_discount: discount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: CRUD coupons
router.get('/admin', authenticateToken, requireStaffRole('super_admin', 'order_manager'), (req, res) => {
  try {
    const coupons = db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
    res.json({ success: true, coupons });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin', authenticateToken, requireStaffRole('super_admin'), (req, res) => {
  try {
    const { code, discount_type, discount_value, min_order_value = 0, max_discount, usage_limit, is_active = 1 } = req.body;
    if (!code || !discount_type || !discount_value) {
      return res.status(400).json({ success: false, error: 'Code, type, and discount value are required.' });
    }

    const result = db.prepare(`
      INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_discount, usage_limit, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(code.toUpperCase().trim(), discount_type, Number(discount_value), Number(min_order_value), max_discount ? Number(max_discount) : null, usage_limit ? Number(usage_limit) : null, is_active ? 1 : 0);

    res.status(201).json({ success: true, id: result.lastInsertRowid, message: 'Coupon created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/admin/:id', authenticateToken, requireStaffRole('super_admin'), (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM coupons WHERE id = ?').run(id);
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
