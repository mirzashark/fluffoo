import express from 'express';
import db from '../db/database.js';
import { authenticateToken, requireStaffRole } from '../middleware/auth.js';

const router = express.Router();

// Public: Get delivery zones and city delivery fees
router.get('/zones', (req, res) => {
  try {
    const zones = db.prepare('SELECT city_name, delivery_fee, estimated_days FROM delivery_zones WHERE is_active = 1 ORDER BY city_name ASC').all();
    const thresholdSetting = db.prepare("SELECT value FROM site_settings WHERE key = 'free_shipping_threshold'").get();
    const defaultFeeSetting = db.prepare("SELECT value FROM site_settings WHERE key = 'standard_delivery_fee'").get();

    res.json({
      success: true,
      zones,
      free_shipping_threshold: thresholdSetting ? Number(thresholdSetting.value) : 3500,
      standard_delivery_fee: defaultFeeSetting ? Number(defaultFeeSetting.value) : 250
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Couriers & Logistics
router.get('/admin/couriers', authenticateToken, requireStaffRole('order_manager', 'super_admin'), (req, res) => {
  try {
    const couriers = db.prepare('SELECT * FROM couriers ORDER BY id ASC').all();
    const zones = db.prepare('SELECT * FROM delivery_zones ORDER BY city_name ASC').all();
    res.json({ success: true, couriers, zones });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/couriers', authenticateToken, requireStaffRole('order_manager', 'super_admin'), (req, res) => {
  try {
    const { name, phone, tracking_url_template } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Courier name is required.' });
    }
    const result = db.prepare('INSERT INTO couriers (name, phone, tracking_url_template) VALUES (?, ?, ?)').run(name, phone || null, tracking_url_template || null);
    res.status(201).json({ success: true, id: result.lastInsertRowid, message: 'Courier added' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
