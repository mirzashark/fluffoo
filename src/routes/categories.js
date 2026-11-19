import express from 'express';
import db from '../db/database.js';
import { authenticateToken, requireStaffRole } from '../middleware/auth.js';

const router = express.Router();

// Public: Get all active categories with product counts
router.get('/', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
      FROM categories c
      WHERE c.is_active = 1
      ORDER BY c.display_order ASC, c.id ASC
    `).all();

    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: CRUD categories
router.post('/admin', authenticateToken, requireStaffRole('product_manager', 'super_admin'), (req, res) => {
  try {
    const { name, slug, description, image_url, display_order = 0, is_active = 1 } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required.' });
    }
    const autoSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const result = db.prepare(`
      INSERT INTO categories (name, slug, description, image_url, display_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, autoSlug, description || null, image_url || null, Number(display_order), is_active ? 1 : 0);

    res.status(201).json({ success: true, id: result.lastInsertRowid, message: 'Category created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/admin/:id', authenticateToken, requireStaffRole('product_manager', 'super_admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, image_url, display_order, is_active } = req.body;

    db.prepare(`
      UPDATE categories SET
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        description = COALESCE(?, description),
        image_url = COALESCE(?, image_url),
        display_order = COALESCE(?, display_order),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      name, slug, description, image_url,
      display_order !== undefined ? Number(display_order) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id
    );

    res.json({ success: true, message: 'Category updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/admin/:id', authenticateToken, requireStaffRole('product_manager', 'super_admin'), (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
