import express from 'express';
import db from '../db/database.js';
import { authenticateToken, requireStaffRole } from '../middleware/auth.js';

const router = express.Router();

// Admin: Inventory overview & low-stock alerts (SRS § 7.7)
router.get('/admin/overview', authenticateToken, requireStaffRole('product_manager', 'super_admin'), (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.id, p.name, p.sku, p.stock_quantity, p.stock_status, p.low_stock_threshold,
             c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.stock_quantity ASC
    `).all();

    const variations = db.prepare(`
      SELECT pv.id, pv.product_id, pv.sku, pv.attribute_type, pv.attribute_value,
             pv.stock_quantity, pv.stock_status, p.name as product_name
      FROM product_variations pv
      JOIN products p ON pv.product_id = p.id
      ORDER BY pv.stock_quantity ASC
    `).all();

    const lowStockItems = products.filter(p => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0);
    const outOfStockItems = products.filter(p => p.stock_quantity <= 0);

    res.json({
      success: true,
      products,
      variations,
      stats: {
        total_tracked: products.length,
        low_stock_count: lowStockItems.length,
        out_of_stock_count: outOfStockItems.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Manual stock adjustment (SRS § 7.7)
router.post('/admin/adjust', authenticateToken, requireStaffRole('product_manager', 'super_admin'), (req, res) => {
  try {
    const { product_id, variation_id, new_quantity, reason } = req.body;

    if (!product_id || new_quantity === undefined || !reason) {
      return res.status(400).json({ success: false, error: 'Product ID, new quantity, and adjustment reason are required.' });
    }

    const qty = Number(new_quantity);
    if (qty < 0) {
      return res.status(400).json({ success: false, error: 'Quantity cannot be negative.' });
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      if (variation_id) {
        const v = db.prepare('SELECT * FROM product_variations WHERE id = ? AND product_id = ?').get(variation_id, product_id);
        if (!v) {
          return res.status(404).json({ success: false, error: 'Variation not found.' });
        }
        const delta = qty - v.stock_quantity;
        const status = qty <= 0 ? 'out_of_stock' : 'in_stock';
        db.prepare('UPDATE product_variations SET stock_quantity = ?, stock_status = ? WHERE id = ?').run(qty, status, variation_id);

        db.prepare(`
          INSERT INTO inventory_logs (product_id, variation_id, change_type, delta, previous_stock, new_stock, reason, staff_id)
          VALUES (?, ?, 'manual_adjustment', ?, ?, ?, ?, ?)
        `).run(product_id, variation_id, delta, v.stock_quantity, qty, reason, req.user.id);
      } else {
        const p = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
        if (!p) {
          return res.status(404).json({ success: false, error: 'Product not found.' });
        }
        const delta = qty - p.stock_quantity;
        const status = qty <= 0 ? 'out_of_stock' : (qty <= p.low_stock_threshold ? 'low_stock' : 'in_stock');
        db.prepare('UPDATE products SET stock_quantity = ?, stock_status = ? WHERE id = ?').run(qty, status, product_id);

        db.prepare(`
          INSERT INTO inventory_logs (product_id, change_type, delta, previous_stock, new_stock, reason, staff_id)
          VALUES (?, 'manual_adjustment', ?, ?, ?, ?, ?)
        `).run(product_id, delta, p.stock_quantity, qty, reason, req.user.id);
      }

      db.exec('COMMIT;');
      res.json({ success: true, message: 'Stock successfully adjusted and recorded in inventory history.' });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Movement history logs
router.get('/admin/logs', authenticateToken, requireStaffRole('product_manager', 'super_admin'), (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT il.*, p.name as product_name, pv.attribute_value as variation_name, s.name as staff_name
      FROM inventory_logs il
      JOIN products p ON il.product_id = p.id
      LEFT JOIN product_variations pv ON il.variation_id = pv.id
      LEFT JOIN staff s ON il.staff_id = s.id
      ORDER BY il.id DESC
      LIMIT 100
    `).all();

    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
