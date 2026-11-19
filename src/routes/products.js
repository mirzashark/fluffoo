import express from 'express';
import db from '../db/database.js';
import { authenticateToken, requireStaffRole } from '../middleware/auth.js';

const router = express.Router();

// --- Public Storefront Endpoints ---

// Browse all published products with filtering, search, and sorting
router.get('/', (req, res) => {
  try {
    const { category, search, min_price, max_price, sort = 'newest', page = 1, limit = 12 } = req.query;

    let query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (category && category !== 'all') {
      query += ` AND (c.slug = ? OR c.name LIKE ?)`;
      params.push(category, `%${category}%`);
    }

    if (search) {
      query += ` AND (p.name LIKE ? OR p.short_description LIKE ? OR p.sku LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (min_price) {
      query += ` AND COALESCE(p.sale_price, p.regular_price) >= ?`;
      params.push(Number(min_price));
    }

    if (max_price) {
      query += ` AND COALESCE(p.sale_price, p.regular_price) <= ?`;
      params.push(Number(max_price));
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        query += ` ORDER BY COALESCE(p.sale_price, p.regular_price) ASC`;
        break;
      case 'price_desc':
        query += ` ORDER BY COALESCE(p.sale_price, p.regular_price) DESC`;
        break;
      case 'popularity':
      case 'best_sellers':
        query += ` ORDER BY p.is_featured DESC, p.id DESC`;
        break;
      case 'newest':
      default:
        query += ` ORDER BY p.id DESC`;
        break;
    }

    // Pagination
    const offset = (Number(page) - 1) * Number(limit);
    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const totalCount = db.prepare(countQuery).get(...params).total;

    query += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const products = db.prepare(query).all(...params).map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      discount_percentage: p.sale_price && p.sale_price < p.regular_price
        ? Math.round(((p.regular_price - p.sale_price) / p.regular_price) * 100)
        : 0
    }));

    res.json({
      success: true,
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Featured Products
router.get('/featured', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND p.is_featured = 1
      ORDER BY p.id ASC
    `).all().map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      discount_percentage: p.sale_price && p.sale_price < p.regular_price
        ? Math.round(((p.regular_price - p.sale_price) / p.regular_price) * 100)
        : 0
    }));

    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single product detail page by slug or id
router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (p.slug = ? OR p.id = ?) AND p.is_active = 1
    `).get(slug, isNaN(Number(slug)) ? -1 : Number(slug));

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    const variations = db.prepare(`
      SELECT * FROM product_variations
      WHERE product_id = ? AND is_active = 1
      ORDER BY id ASC
    `).all(product.id);

    const related = db.prepare(`
      SELECT id, name, slug, regular_price, sale_price, featured_image, stock_status
      FROM products
      WHERE category_id = ? AND id != ? AND is_active = 1
      LIMIT 4
    `).all(product.category_id || 0, product.id);

    res.json({
      success: true,
      product: {
        ...product,
        images: JSON.parse(product.images || '[]'),
        discount_percentage: product.sale_price && product.sale_price < product.regular_price
          ? Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100)
          : 0,
        variations,
        related
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Admin / Staff Product Management ---

// List all products for admin (including inactive/drafts)
router.get('/admin/all', authenticateToken, requireStaffRole('product_manager', 'super_admin'), (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name,
        (SELECT COUNT(*) FROM product_variations pv WHERE pv.product_id = p.id) as variation_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `).all().map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]')
    }));

    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create product (SRS § 7.4: Sale price <= regular price, unique SKU)
router.post('/admin', authenticateToken, requireStaffRole('product_manager', 'super_admin'), (req, res) => {
  try {
    const {
      name, slug, sku, short_description, full_description,
      regular_price, sale_price, stock_quantity = 0, low_stock_threshold = 5,
      category_id, images = [], featured_image, is_featured = 0, is_active = 1,
      seo_title, seo_description
    } = req.body;

    if (!name || !sku || !regular_price) {
      return res.status(400).json({ success: false, error: 'Product name, SKU, and regular price are required.' });
    }

    if (sale_price && Number(sale_price) > Number(regular_price)) {
      return res.status(400).json({ success: false, error: 'Sale price cannot exceed regular price.' });
    }

    const autoSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const stockStatus = Number(stock_quantity) <= 0
      ? 'out_of_stock'
      : (Number(stock_quantity) <= Number(low_stock_threshold) ? 'low_stock' : 'in_stock');

    const result = db.prepare(`
      INSERT INTO products (
        name, slug, sku, short_description, full_description,
        regular_price, sale_price, stock_quantity, stock_status, low_stock_threshold,
        category_id, images, featured_image, is_featured, is_active,
        seo_title, seo_description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, autoSlug, sku, short_description, full_description,
      Number(regular_price), sale_price ? Number(sale_price) : null,
      Number(stock_quantity), stockStatus, Number(low_stock_threshold),
      category_id || null, JSON.stringify(images), featured_image || (images[0] || null),
      is_featured ? 1 : 0, is_active ? 1 : 0, seo_title, seo_description
    );

    // Initial inventory log
    if (Number(stock_quantity) > 0) {
      db.prepare(`
        INSERT INTO inventory_logs (product_id, change_type, delta, previous_stock, new_stock, reason, staff_id)
        VALUES (?, 'initial_stock', ?, 0, ?, 'Initial product setup', ?)
      `).run(result.lastInsertRowid, Number(stock_quantity), Number(stock_quantity), req.user.id);
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      id: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update product
router.put('/admin/:id', authenticateToken, requireStaffRole('product_manager', 'super_admin'), (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    const {
      name, slug, sku, short_description, full_description,
      regular_price, sale_price, stock_quantity, low_stock_threshold,
      category_id, images, featured_image, is_featured, is_active,
      seo_title, seo_description
    } = req.body;

    const regPrice = regular_price !== undefined ? Number(regular_price) : existing.regular_price;
    const sPrice = sale_price !== undefined ? (sale_price ? Number(sale_price) : null) : existing.sale_price;

    if (sPrice && sPrice > regPrice) {
      return res.status(400).json({ success: false, error: 'Sale price cannot exceed regular price.' });
    }

    const newStock = stock_quantity !== undefined ? Number(stock_quantity) : existing.stock_quantity;
    const threshold = low_stock_threshold !== undefined ? Number(low_stock_threshold) : existing.low_stock_threshold;
    const stockStatus = newStock <= 0 ? 'out_of_stock' : (newStock <= threshold ? 'low_stock' : 'in_stock');

    db.prepare(`
      UPDATE products SET
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        sku = COALESCE(?, sku),
        short_description = COALESCE(?, short_description),
        full_description = COALESCE(?, full_description),
        regular_price = ?,
        sale_price = ?,
        stock_quantity = ?,
        stock_status = ?,
        low_stock_threshold = ?,
        category_id = ?,
        images = COALESCE(?, images),
        featured_image = COALESCE(?, featured_image),
        is_featured = COALESCE(?, is_featured),
        is_active = COALESCE(?, is_active),
        seo_title = COALESCE(?, seo_title),
        seo_description = COALESCE(?, seo_description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, slug, sku, short_description, full_description,
      regPrice, sPrice, newStock, stockStatus, threshold,
      category_id !== undefined ? category_id : existing.category_id,
      images ? JSON.stringify(images) : null,
      featured_image,
      is_featured !== undefined ? (is_featured ? 1 : 0) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      seo_title, seo_description,
      id
    );

    // If stock changed manually
    if (stock_quantity !== undefined && newStock !== existing.stock_quantity) {
      const delta = newStock - existing.stock_quantity;
      db.prepare(`
        INSERT INTO inventory_logs (product_id, change_type, delta, previous_stock, new_stock, reason, staff_id)
        VALUES (?, 'manual_adjustment', ?, ?, ?, 'Stock updated via product edit', ?)
      `).run(id, delta, existing.stock_quantity, newStock, req.user.id);
    }

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete product
router.delete('/admin/:id', authenticateToken, requireStaffRole('product_manager', 'super_admin'), (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Variations CRUD
router.post('/admin/:id/variations', authenticateToken, requireStaffRole('product_manager', 'super_admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { sku, attribute_type, attribute_value, regular_price, sale_price, stock_quantity = 0 } = req.body;

    if (!sku || !attribute_type || !attribute_value) {
      return res.status(400).json({ success: false, error: 'SKU, attribute type, and value are required.' });
    }

    const stockStatus = Number(stock_quantity) <= 0 ? 'out_of_stock' : 'in_stock';
    const result = db.prepare(`
      INSERT INTO product_variations (
        product_id, sku, attribute_type, attribute_value, regular_price, sale_price, stock_quantity, stock_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, sku, attribute_type, attribute_value, regular_price || null, sale_price || null, Number(stock_quantity), stockStatus);

    res.status(201).json({ success: true, id: result.lastInsertRowid, message: 'Variation added' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/admin/variations/:id', authenticateToken, requireStaffRole('product_manager', 'super_admin'), (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM product_variations WHERE id = ?').run(id);
    res.json({ success: true, message: 'Variation deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
