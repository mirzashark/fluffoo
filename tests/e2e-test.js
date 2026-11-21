import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../src/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://127.0.0.1:3000';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch (e) {
    return { status: res.status, raw: text };
  }
}

async function runTests() {
  console.log('🧪 Starting Fluffoo E-Commerce End-to-End Verification Tests...\n');
  await new Promise(r => setTimeout(r, 800)); // allow server to bind port
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    console.log('--- Test 1: Health Check Endpoint ---');
    const health = await request('/api/v1/health');
    assert(health.status === 200 && health.data.status === 'ok', 'Server health is OK');

    // 2. Products Endpoint
    console.log('\n--- Test 2: Products Catalog ---');
    const prodRes = await request('/api/v1/products?limit=50');
    assert(prodRes.status === 200 && prodRes.data.products.length >= 8, `Fetched ${prodRes.data?.products?.length} catalog products`);
    const honeyBear = prodRes.data.products.find(p => p.sku === 'FLF-HB-45');
    assert(honeyBear && honeyBear.regular_price === 3450 && honeyBear.sale_price === 2850, 'Original Honey Bear prices and discount percentage verified');

    // 3. Settings & Shipping Zones
    console.log('\n--- Test 3: Settings & Logistics ---');
    const setRes = await request('/api/v1/settings');
    assert(setRes.status === 200 && setRes.data.settings.free_shipping_threshold === '3500', 'Free shipping threshold is Rs. 3,500');

    const zonesRes = await request('/api/v1/shipping/zones');
    if (!zonesRes.data || !zonesRes.data.zones) {
      console.log('DEBUG zonesRes:', zonesRes);
    }
    assert(zonesRes.status === 200 && zonesRes.data?.zones?.length > 0, `Loaded ${zonesRes.data?.zones?.length} delivery zones across Pakistan`);

    // 4. Coupon Validation
    console.log('\n--- Test 4: Coupon Validation ---');
    const couponRes = await request('/api/v1/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'CUDDLE10', subtotal: 3000 })
    });
    assert(couponRes.status === 200 && couponRes.data.coupon.calculated_discount === 300, 'Coupon CUDDLE10 applied 10% discount (Rs. 300 on Rs. 3,000 subtotal)');

    // 5. Place COD Order (Guest Checkout)
    console.log('\n--- Test 5: Guest Order Placement (Cash on Delivery) ---');
    const orderPayload = {
      customer_name: 'Sara Khan',
      customer_phone: '03001234567',
      customer_email: 'sara.khan@example.com',
      delivery_address: 'House 42, Street 8, Phase 6',
      city: 'Karachi',
      area: 'DHA',
      order_notes: 'Please pack in luxury ribbon wrapping for anniversary',
      coupon_code: 'CUDDLE10',
      payment_method: 'cod',
      items: [
        { product_id: honeyBear.id, quantity: 1 }
      ]
    };

    const orderRes = await request('/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    assert(orderRes.status === 201 && orderRes.data.success, 'COD Order placed successfully');
    const createdOrder = orderRes.data.order;
    assert(createdOrder.order_number.startsWith('FLF-'), `Generated unique order number: ${createdOrder.order_number}`);
    assert(createdOrder.payment_status === 'unpaid', 'COD order payment status is Unpaid');
    assert(createdOrder.order_status === 'pending_confirmation', 'Order initial status is Pending Confirmation');

    // 6. Customer Order Tracking Lookup
    console.log('\n--- Test 6: Customer Order Tracking Lookup ---');
    const trackRes = await request(`/api/v1/orders/track?order_number=${createdOrder.order_number}&phone=03001234567`);
    assert(trackRes.status === 200 && trackRes.data.order.order_number === createdOrder.order_number, 'Customer tracked order successfully by Order Number + Phone');

    // 7. Place Manual Online Payment Order with Proof Upload
    console.log('\n--- Test 7: Manual Online Payment & Proof Upload ---');
    const manualOrderPayload = {
      customer_name: 'Bilal Ahmed',
      customer_phone: '03219876543',
      customer_email: 'bilal@example.com',
      delivery_address: 'Apartment 4B, Silver Heights',
      city: 'Lahore',
      area: 'Gulberg',
      payment_method: 'manual_online',
      items: [
        { product_id: 2, quantity: 1 } // Wobble Cloud Bear
      ]
    };

    const manualOrderRes = await request('/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manualOrderPayload)
    });
    assert(manualOrderRes.status === 201, 'Manual payment order created');
    const manualOrder = manualOrderRes.data.order;
    assert(manualOrder.payment_status === 'pending_verification', 'Manual payment order payment status is Pending Verification');

    // Upload mock proof
    const testProofPath = path.resolve(__dirname, 'mock_proof.png');
    // 1x1 transparent PNG bytes
    const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    fs.writeFileSync(testProofPath, pngBytes);

    const formData = new FormData();
    formData.append('order_number', manualOrder.order_number);
    formData.append('payment_service', 'Meezan Bank Transfer');
    formData.append('transaction_ref', 'MB-TRX-987654');
    const blob = new Blob([pngBytes], { type: 'image/png' });
    formData.append('proof_file', blob, 'receipt.png');

    const uploadRes = await fetch(`${BASE_URL}/api/v1/payments/proof`, {
      method: 'POST',
      body: formData
    });
    const uploadData = await uploadRes.json();
    assert(uploadData.success, 'Payment proof uploaded and queued for admin verification');
    if (fs.existsSync(testProofPath)) fs.unlinkSync(testProofPath);

    // 8. Staff / Admin Authentication
    console.log('\n--- Test 8: Admin Authentication & RBAC ---');
    const adminLoginRes = await request('/api/v1/auth/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@fluffoo.pk', password: 'FluffooAdmin2026!' })
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.data.token, 'Super Admin logged in with JWT');
    const adminToken = adminLoginRes.data.token;

    // 9. Payment Manager Verification Queue
    console.log('\n--- Test 9: Admin Payment Verification Queue ---');
    const pendingProofsRes = await request('/api/v1/payments/admin/pending', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(pendingProofsRes.status === 200 && pendingProofsRes.data.pending_verifications.length > 0, 'Found pending proof in admin queue');

    // 10. Admin Approves Payment
    console.log('\n--- Test 10: Admin Approves Payment Proof ---');
    const approveRes = await request(`/api/v1/payments/admin/verify/${manualOrder.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ action: 'approve' })
    });
    assert(approveRes.status === 200 && approveRes.data.success, 'Admin approved payment proof. Payment status -> Paid, Order -> Confirmed');

    // Verify order updated
    const updatedOrderRes = await request(`/api/v1/orders/admin/${manualOrder.id}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(updatedOrderRes.data.order.payment_status === 'paid', 'Verified order payment_status is now Paid in database');
    assert(updatedOrderRes.data.order.order_status === 'confirmed', 'Verified order_status transitioned to Confirmed');

    // 11. Dashboard Overview Metrics Check (SRS § 7.2)
    console.log('\n--- Test 11: Real-Time Operational Dashboard KPIs ---');
    const dashRes = await request('/api/v1/admin/dashboard', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(dashRes.status === 200 && dashRes.data.metrics.total_orders >= 2, `Dashboard calculated real database metrics: ${dashRes.data.metrics.total_orders} total orders`);
    assert(dashRes.data.metrics.collected_revenue > 0, `Collected revenue correctly computed from Paid orders: Rs. ${dashRes.data.metrics.collected_revenue}`);

    console.log(`\n========================================`);
    console.log(`🎉 ALL TESTS COMPLETED: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    process.exit(failed > 0 ? 1 : 0);
  } catch (e) {
    console.error('Fatal test error:', e);
    process.exit(1);
  }
}

runTests();
