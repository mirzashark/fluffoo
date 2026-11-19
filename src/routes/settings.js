import express from 'express';
import db from '../db/database.js';
import { authenticateToken, requireStaffRole } from '../middleware/auth.js';

const router = express.Router();

// Public: Get storefront settings
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM site_settings').all();
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Update settings
router.put('/admin', authenticateToken, requireStaffRole('super_admin'), (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'Settings object is required.' });
    }

    const stmt = db.prepare('INSERT OR REPLACE INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
    for (const [key, val] of Object.entries(settings)) {
      stmt.run(key, String(val));
    }

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
