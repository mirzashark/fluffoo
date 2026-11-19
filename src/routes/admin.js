import express from 'express';
import db from '../db/database.js';
import { authenticateToken, requireStaffRole } from '../middleware/auth.js';

const router = express.Router();

// Dashboard overview metrics (SRS § 7.2)
router.get('/dashboard', authenticateToken, requireStaffRole('super_admin', 'order_manager', 'product_manager', 'payment_manager'), (req, res) => {
  try {
    // 1. Order Status Counts
    const orderCounts = db.prepare(`
      SELECT order_status, COUNT(*) as count
      FROM orders
      GROUP BY order_status
    `).all();

    const orderStatusMap = Object.fromEntries(orderCounts.map(r => [r.order_status, r.count]));

    // 2. Financial Metrics: Total Order Value vs Actually Collected Payments (SRS § 9)
    const financialStats = db.prepare(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total_payable), 0) as gross_order_revenue,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_payable ELSE 0 END), 0) as collected_revenue,
        COALESCE(AVG(total_payable), 0) as avg_order_value
      FROM orders
      WHERE order_status != 'cancelled'
    `).get();

    // 3. Customers and Catalog stats
    const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get().count;

    // 4. Low stock & out of stock products (SRS § 7.2)
    const lowStockCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock_quantity <= low_stock_threshold AND stock_quantity > 0 AND is_active = 1').get().count;
    const outOfStockCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock_quantity <= 0 AND is_active = 1').get().count;

    // 5. Pending payment verifications
    const pendingVerificationsCount = db.prepare("SELECT COUNT(*) as count FROM payment_proofs WHERE status = 'pending_verification'").get().count;

    // 6. Recent Orders
    const recentOrders = db.prepare(`
      SELECT id, order_number, customer_name, customer_phone, total_payable, payment_method, payment_status, order_status, created_at
      FROM orders
      ORDER BY id DESC
      LIMIT 8
    `).all();

    // 7. Top-Selling Products
    const topProducts = db.prepare(`
      SELECT p.id, p.name, p.featured_image, SUM(oi.quantity) as units_sold, SUM(oi.line_total) as total_sales
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.order_status != 'cancelled'
      GROUP BY p.id
      ORDER BY units_sold DESC
      LIMIT 5
    `).all();

    res.json({
      success: true,
      metrics: {
        total_orders: financialStats.total_orders,
        gross_order_revenue: financialStats.gross_order_revenue,
        collected_revenue: financialStats.collected_revenue,
        avg_order_value: Math.round(financialStats.avg_order_value),
        pending_orders: orderStatusMap['pending_confirmation'] || 0,
        confirmed_orders: orderStatusMap['confirmed'] || 0,
        processing_orders: orderStatusMap['processing'] || 0,
        completed_orders: orderStatusMap['delivered'] || 0,
        cancelled_orders: orderStatusMap['cancelled'] || 0,
        total_customers: totalCustomers,
        total_products: totalProducts,
        low_stock_products: lowStockCount,
        out_of_stock_products: outOfStockCount,
        pending_payment_verifications: pendingVerificationsCount
      },
      recent_orders: recentOrders,
      top_products: topProducts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reports & CSV Export (SRS § 9)
router.get('/reports/export-csv', authenticateToken, requireStaffRole('super_admin', 'order_manager'), (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT order_number, customer_name, customer_phone, city, total_payable,
             payment_method, payment_status, order_status, created_at
      FROM orders
      ORDER BY id DESC
    `).all();

    let csv = 'Order Number,Customer,Phone,City,Total Amount,Payment Method,Payment Status,Order Status,Date\n';
    for (const o of orders) {
      csv += `"${o.order_number}","${o.customer_name}","${o.customer_phone}","${o.city}",${o.total_payable},"${o.payment_method}","${o.payment_status}","${o.order_status}","${o.created_at}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="fluffoo_orders_export.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
