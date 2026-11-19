import express from 'express';
import crypto from 'crypto';
import db from '../db/database.js';
import { authenticateToken, requireStaffRole, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Helper to generate unique human-readable order number
function generateOrderNumber() {
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  return `FLF-${year}-${randomDigits}`;
}

// Helper to build WhatsApp customer notification / contact URL
function buildWhatsAppUrl(phone, message) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedMsg = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
}

// --- Public Endpoints ---

// Create Order (Guest or Registered Customer)
router.post('/', optionalAuth, (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      delivery_address,
      city,
      area,
      postal_code,
      order_notes,
      items,
      coupon_code,
      payment_method
    } = req.body;

    // 1. Validate required fields
    if (!customer_name || !customer_phone || !delivery_address || !city || !area) {
      return res.status(400).json({
        success: false,
        error: 'Full name, mobile number, delivery address, city, and area are required.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Shopping cart is empty.' });
    }

    if (!['cod', 'manual_online'].includes(payment_method)) {
      return res.status(400).json({ success: false, error: 'Invalid payment method. Choose COD or Manual Online.' });
    }

    // 2. Fetch delivery zone fee & free shipping threshold
    const freeShippingThresholdSetting = db.prepare("SELECT value FROM site_settings WHERE key = 'free_shipping_threshold'").get();
    const freeThreshold = freeShippingThresholdSetting ? Number(freeShippingThresholdSetting.value) : 3500;

    let deliveryFee = 250;
    const zone = db.prepare('SELECT delivery_fee FROM delivery_zones WHERE city_name LIKE ? AND is_active = 1').get(`%${city}%`);
    if (zone) {
      deliveryFee = zone.delivery_fee;
    }

    // 3. Server-side validation of items, prices, and stock
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.product_id);
      if (!product) {
        return res.status(400).json({ success: false, error: `Product ID ${item.product_id} is no longer available.` });
      }

      let unitPrice = product.sale_price ? product.sale_price : product.regular_price;
      let variationName = null;
      let sku = product.sku;
      let variation = null;

      if (item.variation_id) {
        variation = db.prepare('SELECT * FROM product_variations WHERE id = ? AND product_id = ? AND is_active = 1').get(item.variation_id, product.id);
        if (!variation) {
          return res.status(400).json({ success: false, error: `Selected variation is no longer available.` });
        }
        if (variation.sale_price) unitPrice = variation.sale_price;
        else if (variation.regular_price) unitPrice = variation.regular_price;
        variationName = `${variation.attribute_type}: ${variation.attribute_value}`;
        sku = variation.sku;

        // Check variation stock
        if (variation.stock_quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            error: `Only ${variation.stock_quantity} left in stock for ${product.name} (${variationName}).`
          });
        }
      } else {
        // Check base product stock
        if (product.stock_quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            error: `Only ${product.stock_quantity} left in stock for ${product.name}.`
          });
        }
      }

      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      validatedItems.push({
        product,
        variation,
        product_name: product.name,
        variation_name: variationName,
        sku,
        unit_price: unitPrice,
        quantity: item.quantity,
        line_total: lineTotal,
        image_url: variation?.image_url || product.featured_image
      });
    }

    // Calculate delivery charge
    let actualDeliveryCharge = subtotal >= freeThreshold ? 0 : deliveryFee;

    // 4. Validate coupon discount if provided
    let discountAmount = 0;
    let appliedCoupon = null;
    if (coupon_code) {
      const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(coupon_code.toUpperCase());
      if (coupon) {
        if (!coupon.min_order_value || subtotal >= coupon.min_order_value) {
          if (coupon.discount_type === 'percentage') {
            discountAmount = (subtotal * coupon.discount_value) / 100;
            if (coupon.max_discount && discountAmount > coupon.max_discount) {
              discountAmount = coupon.max_discount;
            }
          } else {
            discountAmount = coupon.discount_value;
          }
          if (discountAmount > subtotal) discountAmount = subtotal;
          appliedCoupon = coupon;
        }
      }
    }

    const totalPayable = Math.max(0, subtotal - discountAmount + actualDeliveryCharge);
    const orderNumber = generateOrderNumber();
    const paymentStatus = payment_method === 'cod' ? 'unpaid' : 'pending_verification';
    const orderStatus = 'pending_confirmation';
    const isGuest = req.user?.type === 'customer' ? 0 : 1;
    const customerId = req.user?.type === 'customer' ? req.user.id : null;

    // 5. Database transaction: Insert order, items, inventory reduction, and status history
    db.exec('BEGIN TRANSACTION;');
    try {
      const orderStmt = db.prepare(`
        INSERT INTO orders (
          order_number, customer_id, is_guest, customer_name, customer_phone, customer_email,
          delivery_address, city, area, postal_code, order_notes,
          subtotal, discount_amount, delivery_charge, total_payable, coupon_code,
          payment_method, payment_status, order_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const orderResult = orderStmt.run(
        orderNumber, customerId, isGuest, customer_name, customer_phone, customer_email || null,
        delivery_address, city, area, postal_code || null, order_notes || null,
        subtotal, discountAmount, actualDeliveryCharge, totalPayable, appliedCoupon?.code || null,
        payment_method, paymentStatus, orderStatus
      );

      const orderId = orderResult.lastInsertRowid;

      // Insert items & reduce inventory
      const itemStmt = db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, variation_id, product_name, variation_name, sku, unit_price, quantity, line_total, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const vi of validatedItems) {
        itemStmt.run(
          orderId, vi.product.id, vi.variation?.id || null,
          vi.product_name, vi.variation_name, vi.sku,
          vi.unit_price, vi.quantity, vi.line_total, vi.image_url
        );

        // Deduct inventory
        if (vi.variation) {
          const prev = vi.variation.stock_quantity;
          const next = prev - vi.quantity;
          const status = next <= 0 ? 'out_of_stock' : 'in_stock';
          db.prepare('UPDATE product_variations SET stock_quantity = ?, stock_status = ? WHERE id = ?').run(next, status, vi.variation.id);

          db.prepare(`
            INSERT INTO inventory_logs (product_id, variation_id, change_type, delta, previous_stock, new_stock, reason)
            VALUES (?, ?, 'order_placed', ?, ?, ?, ?)
          `).run(vi.product.id, vi.variation.id, -vi.quantity, prev, next, `Order #${orderNumber}`);
        } else {
          const prev = vi.product.stock_quantity;
          const next = prev - vi.quantity;
          const status = next <= 0 ? 'out_of_stock' : (next <= vi.product.low_stock_threshold ? 'low_stock' : 'in_stock');
          db.prepare('UPDATE products SET stock_quantity = ?, stock_status = ? WHERE id = ?').run(next, status, vi.product.id);

          db.prepare(`
            INSERT INTO inventory_logs (product_id, change_type, delta, previous_stock, new_stock, reason)
            VALUES (?, 'order_placed', ?, ?, ?, ?)
          `).run(vi.product.id, -vi.quantity, prev, next, `Order #${orderNumber}`);
        }
      }

      // Update coupon usage if applicable
      if (appliedCoupon) {
        db.prepare('UPDATE coupons SET times_used = times_used + 1 WHERE id = ?').run(appliedCoupon.id);
      }

      // Record Order History
      db.prepare(`
        INSERT INTO order_status_history (order_id, from_status, to_status, comment)
        VALUES (?, NULL, 'pending_confirmation', 'Order placed by customer')
      `).run(orderId);

      db.exec('COMMIT;');

      // WhatsApp business message draft
      const bizPhoneSetting = db.prepare("SELECT value FROM site_settings WHERE key = 'business_whatsapp'").get();
      const bizPhone = bizPhoneSetting?.value || '+923001234567';

      const whatsappText = `*Fluffoo New Order Notification*\n` +
        `Order Number: *${orderNumber}*\n` +
        `Customer: ${customer_name}\n` +
        `Phone: ${customer_phone}\n` +
        `City: ${city}\n` +
        `Total: Rs. ${totalPayable.toLocaleString()}\n` +
        `Payment Method: ${payment_method === 'cod' ? 'Cash on Delivery' : 'Manual Online Payment'}\n` +
        `Payment Status: ${paymentStatus}\n` +
        `Items: ${validatedItems.map(i => `${i.product_name} x${i.quantity}`).join(', ')}`;

      const whatsappLink = buildWhatsAppUrl(bizPhone, whatsappText);

      res.status(201).json({
        success: true,
        order: {
          id: orderId,
          order_number: orderNumber,
          customer_name,
          customer_phone,
          total_payable: totalPayable,
          payment_method,
          payment_status: paymentStatus,
          order_status: orderStatus,
          delivery_charge: actualDeliveryCharge,
          subtotal,
          discount_amount: discountAmount
        },
        whatsapp_notification_link: whatsappLink
      });
    } catch (innerErr) {
      db.exec('ROLLBACK;');
      throw innerErr;
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Customer Public Order Tracking (SRS § 8.3: Order number + registered mobile verification)
router.get('/track', (req, res) => {
  try {
    const { order_number, phone } = req.query;
    if (!order_number || !phone) {
      return res.status(400).json({ success: false, error: 'Please provide both Order Number and registered Mobile Number.' });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const order = db.prepare(`
      SELECT o.*, c.name as courier_name, c.tracking_url_template
      FROM orders o
      LEFT JOIN couriers c ON o.courier_id = c.id
      WHERE UPPER(o.order_number) = UPPER(?)
    `).get(order_number.trim());

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found with provided order number.' });
    }

    const orderPhoneClean = order.customer_phone.replace(/[^0-9]/g, '');
    if (!orderPhoneClean.endsWith(cleanPhone.slice(-7))) {
      return res.status(403).json({ success: false, error: 'Mobile number does not match order records.' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const history = db.prepare('SELECT from_status, to_status, comment, created_at FROM order_status_history WHERE order_id = ? ORDER BY id ASC').all(order.id);

    // Format courier tracking link
    let trackingLink = null;
    if (order.tracking_number && order.tracking_url_template) {
      trackingLink = order.tracking_url_template.replace('{tracking_id}', order.tracking_number);
    }

    res.json({
      success: true,
      order: {
        order_number: order.order_number,
        order_status: order.order_status,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        customer_name: order.customer_name,
        city: order.city,
        area: order.area,
        delivery_address: order.delivery_address,
        total_payable: order.total_payable,
        delivery_charge: order.delivery_charge,
        courier_name: order.courier_name,
        tracking_number: order.tracking_number,
        tracking_link: trackingLink,
        shipment_date: order.shipment_date,
        created_at: order.created_at,
        items,
        history
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single Order Confirmation Details by Order Number
router.get('/:orderNumber', (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const paymentProof = db.prepare('SELECT id, status, payment_service, transaction_ref, created_at FROM payment_proofs WHERE order_id = ?').get(order.id);

    res.json({ success: true, order, items, paymentProof });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Admin / Staff Order Management ---

// Search, filter, and paginate orders (SRS § 7.8)
router.get('/admin/list', authenticateToken, requireStaffRole('order_manager', 'super_admin', 'payment_manager'), (req, res) => {
  try {
    const { status, payment_status, search, page = 1, limit = 20 } = req.query;

    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      query += ' AND order_status = ?';
      params.push(status);
    }

    if (payment_status && payment_status !== 'all') {
      query += ' AND payment_status = ?';
      params.push(payment_status);
    }

    if (search) {
      query += ' AND (order_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY id DESC';

    const offset = (Number(page) - 1) * Number(limit);
    const totalCount = db.prepare(`SELECT COUNT(*) as c FROM (${query})`).get(...params).c;

    query += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const orders = db.prepare(query).all(...params);

    res.json({
      success: true,
      orders,
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

// Full Order Details with Items, Proof, and Timeline
router.get('/admin/:id', authenticateToken, requireStaffRole('order_manager', 'super_admin', 'payment_manager'), (req, res) => {
  try {
    const { id } = req.params;
    const order = db.prepare(`
      SELECT o.*, c.name as courier_name_full
      FROM orders o
      LEFT JOIN couriers c ON o.courier_id = c.id
      WHERE o.id = ?
    `).get(id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    const proof = db.prepare('SELECT * FROM payment_proofs WHERE order_id = ?').get(id);
    const history = db.prepare(`
      SELECT h.*, s.name as staff_name
      FROM order_status_history h
      LEFT JOIN staff s ON h.changed_by_staff_id = s.id
      WHERE h.order_id = ?
      ORDER BY h.id ASC
    `).all(id);

    res.json({ success: true, order, items, proof, history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Order Status, Tracking, or Logistics (SRS § 7.8 & § 8.4)
router.put('/admin/:id/status', authenticateToken, requireStaffRole('order_manager', 'super_admin'), (req, res) => {
  try {
    const { id } = req.params;
    const {
      order_status,
      payment_status,
      courier_id,
      tracking_number,
      internal_notes,
      customer_notes,
      comment
    } = req.body;

    const currentOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!currentOrder) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const validStatuses = [
      'pending_confirmation', 'confirmed', 'processing', 'packed',
      'ready_for_shipment', 'shipped', 'out_for_delivery', 'delivered',
      'cancelled', 'return_requested', 'returned', 'refunded'
    ];

    if (order_status && !validStatuses.includes(order_status)) {
      return res.status(400).json({ success: false, error: `Invalid order status: ${order_status}` });
    }

    // Courier lookup if provided
    let courierName = currentOrder.courier_name;
    if (courier_id) {
      const courier = db.prepare('SELECT name FROM couriers WHERE id = ?').get(courier_id);
      if (courier) courierName = courier.name;
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      const newStatus = order_status || currentOrder.order_status;
      const newPaymentStatus = payment_status || currentOrder.payment_status;

      // Check if order is being cancelled or refunded -> restore inventory per SRS § 7.7
      const shouldRestoreInventory = ['cancelled', 'returned', 'refunded'].includes(newStatus) &&
        !['cancelled', 'returned', 'refunded'].includes(currentOrder.order_status);

      if (shouldRestoreInventory) {
        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
        for (const item of items) {
          if (item.variation_id) {
            const v = db.prepare('SELECT stock_quantity FROM product_variations WHERE id = ?').get(item.variation_id);
            if (v) {
              const prev = v.stock_quantity;
              const next = prev + item.quantity;
              db.prepare("UPDATE product_variations SET stock_quantity = ?, stock_status = 'in_stock' WHERE id = ?").run(next, item.variation_id);
              db.prepare(`
                INSERT INTO inventory_logs (product_id, variation_id, change_type, delta, previous_stock, new_stock, reason, staff_id)
                VALUES (?, ?, 'order_cancelled', ?, ?, ?, ?, ?)
              `).run(item.product_id, item.variation_id, item.quantity, prev, next, `Restock from Order #${currentOrder.order_number} ${newStatus}`, req.user.id);
            }
          } else {
            const p = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(item.product_id);
            if (p) {
              const prev = p.stock_quantity;
              const next = prev + item.quantity;
              db.prepare("UPDATE products SET stock_quantity = ?, stock_status = 'in_stock' WHERE id = ?").run(next, item.product_id);
              db.prepare(`
                INSERT INTO inventory_logs (product_id, change_type, delta, previous_stock, new_stock, reason, staff_id)
                VALUES (?, 'order_cancelled', ?, ?, ?, ?, ?)
              `).run(item.product_id, item.quantity, prev, next, `Restock from Order #${currentOrder.order_number} ${newStatus}`, req.user.id);
            }
          }
        }
      }

      db.prepare(`
        UPDATE orders SET
          order_status = ?,
          payment_status = ?,
          courier_id = COALESCE(?, courier_id),
          courier_name = COALESCE(?, courier_name),
          tracking_number = COALESCE(?, tracking_number),
          shipment_date = CASE WHEN ? = 'shipped' AND shipment_date IS NULL THEN CURRENT_TIMESTAMP ELSE shipment_date END,
          internal_notes = COALESCE(?, internal_notes),
          customer_notes = COALESCE(?, customer_notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        newStatus,
        newPaymentStatus,
        courier_id || null,
        courierName || null,
        tracking_number || null,
        newStatus,
        internal_notes || null,
        customer_notes || null,
        id
      );

      // Record in order status history if changed
      if (newStatus !== currentOrder.order_status) {
        db.prepare(`
          INSERT INTO order_status_history (order_id, from_status, to_status, comment, changed_by_staff_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, currentOrder.order_status, newStatus, comment || `Status updated to ${newStatus}`, req.user.id);
      }

      db.exec('COMMIT;');
      res.json({ success: true, message: 'Order status updated successfully' });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
