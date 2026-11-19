import express from 'express';
import path from 'path';
import fs from 'fs';
import db from '../db/database.js';
import { uploadPaymentProof } from '../middleware/upload.js';
import { authenticateToken, requireStaffRole } from '../middleware/auth.js';

const router = express.Router();

// Public: Customer uploads proof of payment for an order
router.post('/proof', uploadPaymentProof.single('proof_file'), (req, res) => {
  try {
    const { order_number, payment_service, transaction_ref } = req.body;

    if (!order_number) {
      return res.status(400).json({ success: false, error: 'Order number is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Proof file (.jpg, .jpeg, .png, or .pdf) is required.' });
    }

    const order = db.prepare('SELECT id, customer_name, customer_phone, total_payable, payment_status FROM orders WHERE UPPER(order_number) = UPPER(?)').get(order_number.trim());
    if (!order) {
      // Remove uploaded file if order doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Order not found with provided order number.' });
    }

    // Insert or replace payment proof
    const existingProof = db.prepare('SELECT id, proof_file_path FROM payment_proofs WHERE order_id = ?').get(order.id);
    if (existingProof) {
      try {
        if (fs.existsSync(existingProof.proof_file_path)) {
          fs.unlinkSync(existingProof.proof_file_path);
        }
      } catch (e) {
        console.error('Old proof cleanup error:', e);
      }
      db.prepare(`
        UPDATE payment_proofs SET
          payment_service = ?,
          transaction_ref = ?,
          proof_file_path = ?,
          mime_type = ?,
          file_size = ?,
          status = 'pending_verification',
          admin_rejection_reason = NULL,
          reviewed_by_staff_id = NULL,
          reviewed_at = NULL,
          created_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `).run(
        payment_service || 'Bank Transfer',
        transaction_ref || null,
        req.file.path,
        req.file.mimetype,
        req.file.size,
        order.id
      );
    } else {
      db.prepare(`
        INSERT INTO payment_proofs (
          order_id, payment_service, transaction_ref, proof_file_path, mime_type, file_size, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending_verification')
      `).run(
        order.id,
        payment_service || 'Bank Transfer',
        transaction_ref || null,
        req.file.path,
        req.file.mimetype,
        req.file.size
      );
    }

    // Set order payment status to pending_verification (per SRS § 5.2: upload NEVER marks as paid)
    db.prepare("UPDATE orders SET payment_status = 'pending_verification', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(order.id);

    // Build WhatsApp message for submission
    const bizPhone = db.prepare("SELECT value FROM site_settings WHERE key = 'business_whatsapp'").get()?.value || '+923001234567';
    const waText = `*Fluffoo Payment Proof Submitted*\n` +
      `Order: *${order_number}*\n` +
      `Customer: ${order.customer_name}\n` +
      `Amount: Rs. ${order.total_payable.toLocaleString()}\n` +
      `Service: ${payment_service || 'Bank/Wallet'}\n` +
      `Transaction Ref: ${transaction_ref || 'N/A'}\n` +
      `Status: Verification Pending by Admin`;

    const waLink = `https://wa.me/${bizPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waText)}`;

    res.json({
      success: true,
      message: 'Payment proof uploaded successfully and queued for admin verification.',
      order_number,
      whatsapp_link: waLink
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Get all pending payment verifications (SRS § 7.9)
router.get('/admin/pending', authenticateToken, requireStaffRole('payment_manager', 'super_admin'), (req, res) => {
  try {
    const list = db.prepare(`
      SELECT pp.*, o.order_number, o.customer_name, o.customer_phone, o.customer_email,
             o.total_payable, o.created_at as order_date, o.order_status
      FROM payment_proofs pp
      JOIN orders o ON pp.order_id = o.id
      WHERE pp.status = 'pending_verification'
      ORDER BY pp.created_at ASC
    `).all();

    res.json({ success: true, pending_verifications: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Securely view/download uploaded payment proof (SRS § 11: restricted to staff)
router.get('/admin/proof/:id/file', authenticateToken, requireStaffRole('payment_manager', 'super_admin', 'order_manager'), (req, res) => {
  try {
    const { id } = req.params;
    const proof = db.prepare('SELECT proof_file_path, mime_type FROM payment_proofs WHERE id = ?').get(id);

    if (!proof || !fs.existsSync(proof.proof_file_path)) {
      return res.status(404).json({ success: false, error: 'Proof file not found on server.' });
    }

    res.setHeader('Content-Type', proof.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    fs.createReadStream(proof.proof_file_path).pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Approve or Reject payment proof (SRS § 5.2 & § 7.9)
router.post('/admin/verify/:orderId', authenticateToken, requireStaffRole('payment_manager', 'super_admin'), (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, reason } = req.body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action must be "approve" or "reject".' });
    }

    if (action === 'reject' && (!reason || reason.trim().length === 0)) {
      return res.status(400).json({ success: false, error: 'A rejection reason is strictly required when rejecting payment.' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      if (action === 'approve') {
        // Mark payment as paid, order as confirmed
        db.prepare(`
          UPDATE orders SET
            payment_status = 'paid',
            order_status = CASE WHEN order_status = 'pending_confirmation' THEN 'confirmed' ELSE order_status END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(orderId);

        db.prepare(`
          UPDATE payment_proofs SET
            status = 'approved',
            admin_rejection_reason = NULL,
            reviewed_by_staff_id = ?,
            reviewed_at = CURRENT_TIMESTAMP
          WHERE order_id = ?
        `).run(req.user.id, orderId);

        // History log
        db.prepare(`
          INSERT INTO order_status_history (order_id, from_status, to_status, comment, changed_by_staff_id)
          VALUES (?, ?, 'confirmed', 'Payment verified and approved by admin', ?)
        `).run(orderId, order.order_status, req.user.id);

        // Audit log
        db.prepare(`
          INSERT INTO audit_logs (staff_id, action, entity, entity_id, details)
          VALUES (?, 'APPROVE_PAYMENT', 'orders', ?, 'Payment approved')
        `).run(req.user.id, orderId.toString());
      } else {
        // Reject payment
        db.prepare(`
          UPDATE orders SET
            payment_status = 'rejected',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(orderId);

        db.prepare(`
          UPDATE payment_proofs SET
            status = 'rejected',
            admin_rejection_reason = ?,
            reviewed_by_staff_id = ?,
            reviewed_at = CURRENT_TIMESTAMP
          WHERE order_id = ?
        `).run(reason, req.user.id, orderId);

        db.prepare(`
          INSERT INTO order_status_history (order_id, from_status, to_status, comment, changed_by_staff_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(orderId, order.order_status, order.order_status, `Payment rejected by admin. Reason: ${reason}`, req.user.id);

        db.prepare(`
          INSERT INTO audit_logs (staff_id, action, entity, entity_id, details)
          VALUES (?, 'REJECT_PAYMENT', 'orders', ?, ?)
        `).run(req.user.id, orderId.toString(), `Payment rejected: ${reason}`);
      }

      db.exec('COMMIT;');
      res.json({
        success: true,
        message: action === 'approve' ? 'Payment successfully approved!' : 'Payment marked as rejected with reason.'
      });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
