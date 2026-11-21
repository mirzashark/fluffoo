// Fluffoo Storefront Interactive Client (Cart, Checkout, Manual Online Payment Proof, WhatsApp)

let cart = JSON.parse(localStorage.getItem('fluffoo_cart') || '[]');
let catalogProducts = [];
let deliveryZones = [];
let storeSettings = {};
let appliedCoupon = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  await fetchInitialData();
  updateHeaderCart();
  setupProductCardListeners();
});

async function fetchInitialData() {
  try {
    const [prodRes, zonesRes, setRes] = await Promise.all([
      fetch('/api/v1/products'),
      fetch('/api/v1/shipping/zones'),
      fetch('/api/v1/settings')
    ]);

    const prodData = await prodRes.json();
    if (prodData.success) {
      catalogProducts = prodData.products;
      renderCatalogGrid();
    }

    const zonesData = await zonesRes.json();
    if (zonesData.success) {
      deliveryZones = zonesData.zones;
      populateCitySelect();
    }

    const setData = await setRes.json();
    if (setData.success) {
      storeSettings = setData.settings;
      populateBankInstructions();
    }
  } catch (err) {
    console.error('Error loading initial storefront data:', err);
  }
}

function updateHeaderCart() {
  const countEl = document.getElementById('headerCartCount');
  const totalEl = document.getElementById('headerCartTotal');
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (countEl) countEl.textContent = `${count} items`;
  if (totalEl) totalEl.textContent = `Rs. ${total.toLocaleString()}`;

  localStorage.setItem('fluffoo_cart', JSON.stringify(cart));
}

function addToBag(productName, customPrice, customImg) {
  // Find in catalog or build default
  const catalogItem = catalogProducts.find(p => p.name.toLowerCase().includes(productName.toLowerCase()) || productName.toLowerCase().includes(p.name.toLowerCase()));

  const id = catalogItem ? catalogItem.id : 1;
  const name = catalogItem ? catalogItem.name : productName;
  const price = customPrice || (catalogItem ? (catalogItem.sale_price || catalogItem.regular_price) : 2850);
  const img = customImg || (catalogItem ? catalogItem.featured_image : '');
  const sku = catalogItem ? catalogItem.sku : 'FLF-GEN-01';

  const existingIndex = cart.findIndex(item => item.product_id === id && (!item.variation_id));

  if (existingIndex > -1) {
    cart[existingIndex].quantity += 1;
  } else {
    cart.push({
      product_id: id,
      name,
      price,
      image_url: img,
      sku,
      quantity: 1
    });
  }

  updateHeaderCart();
  showToast(`${name} added to your cuddle bag!`);
}

function addToBagById(productId) {
  const item = catalogProducts.find(p => p.id === productId);
  if (!item) return;
  const price = item.sale_price || item.regular_price;
  const existingIndex = cart.findIndex(c => c.product_id === item.id && (!c.variation_id));
  if (existingIndex > -1) {
    cart[existingIndex].quantity += 1;
  } else {
    cart.push({
      product_id: item.id,
      name: item.name,
      price: price,
      image_url: item.featured_image || '',
      sku: item.sku,
      quantity: 1
    });
  }
  updateHeaderCart();
  showToast(`${item.name} added to your cuddle bag!`);
}

function renderCatalogGrid() {
  const grid = document.getElementById('productGrid');
  if (!grid || !catalogProducts.length) return;

  grid.innerHTML = catalogProducts.map(p => {
    let cat = 'fluffoo';
    const nameLower = p.name.toLowerCase();
    const slugLower = p.slug.toLowerCase();
    if (nameLower.includes('bunny') || slugLower.includes('bunny')) cat = 'bunny';
    else if (nameLower.includes('giant') || nameLower.includes('long') || nameLower.includes('50cm') || nameLower.includes('55cm') || nameLower.includes('pillow')) cat = 'giant';
    else if (nameLower.includes('sleep') || nameLower.includes('warm') || nameLower.includes('pouch')) cat = 'sleepies';

    const discountBadge = p.discount_percentage > 0
      ? `<span class="bg-pink-accent text-white font-label-sm text-xs px-2.5 py-1 rounded-full font-bold shadow-xs">${p.discount_percentage}% OFF</span>`
      : '';

    return `
      <div class="product-card group bg-white rounded-2xl p-4 shadow-sm hover:shadow-[0_12px_32px_-4px_rgba(255,213,42,0.25)] border border-butter/60 transition-all duration-300 flex flex-col justify-between" data-category="${cat}">
        <div>
          <a href="/product/${p.slug}" class="block relative w-full aspect-square rounded-xl bg-butter-light overflow-hidden mb-3">
            <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${p.featured_image || ''}" alt="${p.name}">
            <div class="absolute top-3 left-3 flex flex-col gap-1">
              ${p.is_featured ? '<span class="bg-sunshine text-cocoa text-xs px-2.5 py-1 rounded-full font-bold shadow-xs">Bestseller</span>' : '<span class="bg-sunshine text-cocoa text-xs px-2.5 py-1 rounded-full font-bold shadow-xs">Trending</span>'}
              ${discountBadge}
            </div>
            <button class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm text-pink-accent hover:scale-110 flex items-center justify-center transition-all shadow-sm border border-butter" onclick="event.preventDefault(); toggleWishlist(this)">
              <span class="material-symbols-outlined text-base">favorite_border</span>
            </button>
            <div class="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-cocoa font-semibold shadow-xs border border-butter">
              ${p.category_name || 'Plush Cuddle'}
            </div>
          </a>
          <div class="flex items-center gap-1.5 mb-1.5">
            <div class="flex items-center text-sunshine-hover text-xs">
              <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
            </div>
            <span class="text-xs text-charcoal">4.9 (50+)</span>
          </div>
          <a href="/product/${p.slug}" class="block">
            <h3 class="text-base text-cocoa group-hover:text-pink-accent transition-colors line-clamp-1 font-bold">${p.name}</h3>
          </a>
          <p class="text-xs text-charcoal line-clamp-1 mt-0.5">${p.short_description || 'Ultra-soft plush companion handcrafted with boundless love.'}</p>
        </div>
        <div class="mt-4 pt-3 border-t border-butter/50 flex items-center justify-between">
          <div class="flex flex-col">
            <span class="text-lg font-bold text-cocoa">Rs. ${(p.sale_price || p.regular_price).toLocaleString()}</span>
            ${p.sale_price && p.sale_price < p.regular_price ? `<span class="text-xs text-charcoal/60 line-through">Rs. ${p.regular_price.toLocaleString()}</span>` : ''}
          </div>
          <button class="w-10 h-10 rounded-full bg-sunshine hover:bg-sunshine-hover text-cocoa flex items-center justify-center shadow-sm transition-transform active:scale-95 border border-sunshine-hover" onclick="addToBagById(${p.id})">
            <span class="material-symbols-outlined text-lg">add_shopping_cart</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function setupProductCardListeners() {
  // Setup dynamic listeners
  console.log('Fluffoo Storefront dynamic cart ready.');
}

function openCartDrawer(e) {
  if (e) e.preventDefault();
  renderCartDrawer();
  document.getElementById('cartDrawer').classList.remove('translate-x-full');
  document.getElementById('cartDrawerBackdrop').classList.remove('hidden');
}

function closeCartDrawer() {
  document.getElementById('cartDrawer').classList.add('translate-x-full');
  document.getElementById('cartDrawerBackdrop').classList.add('hidden');
}

function renderCartDrawer() {
  const container = document.getElementById('cartDrawerItems');
  const subtotalEl = document.getElementById('drawerSubtotal');
  const freeThresholdEl = document.getElementById('drawerFreeShippingPrompt');

  if (!cart.length) {
    container.innerHTML = `
      <div class="py-16 text-center">
        <div class="w-16 h-16 mx-auto rounded-full bg-butter flex items-center justify-center text-cocoa mb-3">
          <span class="material-symbols-outlined text-3xl">shopping_bag</span>
        </div>
        <p class="font-bold text-cocoa">Your cuddle bag is empty</p>
        <p class="text-xs text-charcoal mt-1">Explore our cuddle buddies and pick a soft companion!</p>
      </div>
    `;
    subtotalEl.textContent = 'Rs. 0';
    freeThresholdEl.textContent = 'Free nationwide delivery on orders over Rs. 3,500';
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  subtotalEl.textContent = `Rs. ${subtotal.toLocaleString()}`;

  const freeThreshold = storeSettings.free_shipping_threshold ? Number(storeSettings.free_shipping_threshold) : 3500;
  if (subtotal >= freeThreshold) {
    freeThresholdEl.innerHTML = `<span class="text-emerald-700 font-bold flex items-center justify-center gap-1"><span class="material-symbols-outlined text-sm">verified</span> You unlocked Free Nationwide Delivery!</span>`;
  } else {
    const diff = freeThreshold - subtotal;
    freeThresholdEl.textContent = `Add Rs. ${diff.toLocaleString()} more to unlock FREE Delivery!`;
  }

  container.innerHTML = cart.map((item, index) => `
    <div class="flex items-center gap-3 p-3 bg-white rounded-2xl border border-butter/60 shadow-xs">
      ${item.image_url ? `<img src="${item.image_url}" class="w-14 h-14 object-cover rounded-xl border border-butter">` : ''}
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-cocoa text-sm truncate">${item.name}</h4>
        <span class="text-xs font-bold text-pink-accent">Rs. ${item.price.toLocaleString()}</span>
        <div class="flex items-center gap-2 mt-1">
          <button onclick="updateQty(${index}, -1)" class="w-6 h-6 rounded-full bg-butter text-cocoa font-bold text-xs flex items-center justify-center">-</button>
          <span class="text-xs font-bold text-cocoa w-4 text-center">${item.quantity}</span>
          <button onclick="updateQty(${index}, 1)" class="w-6 h-6 rounded-full bg-butter text-cocoa font-bold text-xs flex items-center justify-center">+</button>
        </div>
      </div>
      <button onclick="removeItem(${index})" class="text-charcoal/50 hover:text-rose-600 p-1">
        <span class="material-symbols-outlined text-lg">delete</span>
      </button>
    </div>
  `).join('');
}

function updateQty(index, delta) {
  if (!cart[index]) return;
  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }
  updateHeaderCart();
  renderCartDrawer();
}

function removeItem(index) {
  cart.splice(index, 1);
  updateHeaderCart();
  renderCartDrawer();
}

// --- Checkout Modal Flow ---
function openCheckoutModal() {
  if (!cart.length) {
    showToast('Please add items to your cart first.');
    return;
  }
  closeCartDrawer();
  updateCheckoutSummary();
  document.getElementById('checkoutModal').classList.remove('hidden');
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal').classList.add('hidden');
}

function populateCitySelect() {
  const select = document.getElementById('checkoutCity');
  if (!select) return;
  select.innerHTML = '<option value="">Select your city...</option>' +
    deliveryZones.map(z => `<option value="${z.city_name}">${z.city_name} (Delivery: Rs. ${z.delivery_fee})</option>`).join('');
}

function populateBankInstructions() {
  const bankBox = document.getElementById('bankDetailsBox');
  if (!bankBox) return;

  bankBox.innerHTML = `
    <div class="p-4 rounded-2xl bg-butter/40 border border-butter text-xs space-y-2">
      <div class="font-bold text-cocoa border-b border-butter/60 pb-1 flex items-center justify-between">
        <span>${storeSettings.bank_name || 'Meezan Bank Limited'}</span>
        <span class="text-[10px] bg-white px-2 py-0.5 rounded-full border border-butter font-semibold">Official Bank Account</span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-cocoa">
        <div><span class="text-charcoal block text-[10px]">Title:</span><strong>${storeSettings.bank_account_title || 'Fluffoo Cuddles (Pvt) Ltd'}</strong></div>
        <div><span class="text-charcoal block text-[10px]">Account #:</span><strong>${storeSettings.bank_account_number || '02010108992341'}</strong></div>
        <div class="col-span-2"><span class="text-charcoal block text-[10px]">IBAN:</span><strong class="font-mono">${storeSettings.bank_iban || 'PK65MEZN0002010108992341'}</strong></div>
      </div>
      <div class="border-t border-butter/60 pt-2 flex justify-between items-center text-cocoa font-semibold">
        <span>EasyPaisa / JazzCash:</span>
        <strong class="text-pink-accent font-bold">${storeSettings.easypaisa_number || '0300-1234567'}</strong>
      </div>
    </div>
  `;
}

function updateCheckoutSummary() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const citySelect = document.getElementById('checkoutCity');
  const selectedCity = citySelect ? citySelect.value : '';

  const zone = deliveryZones.find(z => z.city_name.toLowerCase() === selectedCity.toLowerCase());
  let deliveryFee = zone ? zone.delivery_fee : 250;

  const freeThreshold = storeSettings.free_shipping_threshold ? Number(storeSettings.free_shipping_threshold) : 3500;
  if (subtotal >= freeThreshold) {
    deliveryFee = 0;
  }

  let discount = 0;
  if (appliedCoupon) {
    discount = appliedCoupon.calculated_discount || 0;
  }

  const total = Math.max(0, subtotal - discount + deliveryFee);

  document.getElementById('checkoutSubtotal').textContent = `Rs. ${subtotal.toLocaleString()}`;
  document.getElementById('checkoutDelivery').textContent = deliveryFee === 0 ? 'FREE' : `Rs. ${deliveryFee.toLocaleString()}`;
  document.getElementById('checkoutDiscount').textContent = discount > 0 ? `- Rs. ${discount.toLocaleString()}` : 'Rs. 0';
  document.getElementById('checkoutTotal').textContent = `Rs. ${total.toLocaleString()}`;
}

async function applyCoupon() {
  const code = document.getElementById('checkoutCouponInput').value.trim();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const statusEl = document.getElementById('couponStatus');

  if (!code) return;

  try {
    const res = await fetch('/api/v1/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotal })
    });
    const data = await res.json();
    if (data.success) {
      appliedCoupon = data.coupon;
      statusEl.textContent = `Coupon applied! Rs. ${data.coupon.calculated_discount.toLocaleString()} saved.`;
      statusEl.className = 'text-xs text-emerald-700 font-bold mt-1';
      updateCheckoutSummary();
    } else {
      appliedCoupon = null;
      statusEl.textContent = data.error || 'Invalid coupon code';
      statusEl.className = 'text-xs text-rose-600 font-bold mt-1';
      updateCheckoutSummary();
    }
  } catch (e) {
    statusEl.textContent = 'Error verifying coupon';
  }
}

function handlePaymentMethodChange() {
  const method = document.querySelector('input[name="payment_method"]:checked').value;
  const manualBox = document.getElementById('manualPaymentFields');
  if (method === 'manual_online') {
    manualBox.classList.remove('hidden');
  } else {
    manualBox.classList.add('hidden');
  }
}

async function submitOrder(e) {
  e.preventDefault();
  const btn = document.getElementById('placeOrderBtn');
  const errEl = document.getElementById('checkoutError');
  errEl.classList.add('hidden');

  const customer_name = document.getElementById('custName').value.trim();
  const customer_phone = document.getElementById('custPhone').value.trim();
  const customer_email = document.getElementById('custEmail').value.trim();
  const delivery_address = document.getElementById('custAddress').value.trim();
  const city = document.getElementById('checkoutCity').value;
  const area = document.getElementById('custArea').value.trim();
  const order_notes = document.getElementById('custNotes').value.trim();
  const payment_method = document.querySelector('input[name="payment_method"]:checked').value;

  if (!city) {
    errEl.textContent = 'Please select your delivery city.';
    errEl.classList.remove('hidden');
    return;
  }

  const items = cart.map(i => ({
    product_id: i.product_id,
    variation_id: i.variation_id || null,
    quantity: i.quantity
  }));

  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-lg">progress_activity</span> Placing Your Order...`;

  try {
    // 1. Create Order
    const res = await fetch('/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name,
        customer_phone,
        customer_email,
        delivery_address,
        city,
        area,
        order_notes,
        items,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        payment_method
      })
    });

    const data = await res.json();
    if (!data.success) {
      errEl.textContent = data.error || 'Failed to place order.';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.innerHTML = `Complete Cuddle Order`;
      return;
    }

    const orderNumber = data.order.order_number;

    // 2. If Manual Payment & Proof file was attached, upload proof
    const proofFile = document.getElementById('proofFileInput')?.files[0];
    const txRef = document.getElementById('txRefInput')?.value.trim();

    if (payment_method === 'manual_online' && proofFile) {
      const formData = new FormData();
      formData.append('order_number', orderNumber);
      formData.append('payment_service', 'Bank / Mobile Wallet Transfer');
      formData.append('transaction_ref', txRef);
      formData.append('proof_file', proofFile);

      await fetch('/api/v1/payments/proof', {
        method: 'POST',
        body: formData
      });
    }

    // Clear cart
    cart = [];
    appliedCoupon = null;
    updateHeaderCart();
    closeCheckoutModal();

    // Show Confirmation Dialog
    showOrderConfirmation(data.order, data.whatsapp_notification_link);
  } catch (err) {
    errEl.textContent = 'Network or server error while placing order.';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `Complete Cuddle Order`;
  }
}

function showOrderConfirmation(order, whatsappLink) {
  document.getElementById('confirmOrderNumber').textContent = order.order_number;
  document.getElementById('confirmRecipient').textContent = `${order.customer_name} • ${order.customer_phone}`;
  document.getElementById('confirmTotal').textContent = `Rs. ${order.total_payable.toLocaleString()}`;
  document.getElementById('confirmMethod').textContent = order.payment_method === 'cod' ? 'Cash on Delivery (Pay at Doorstep)' : 'Manual Online Payment (Pending Verification)';

  const waBtn = document.getElementById('confirmWhatsAppBtn');
  if (waBtn) {
    waBtn.href = whatsappLink;
  }

  const trackBtn = document.getElementById('confirmTrackBtn');
  if (trackBtn) {
    trackBtn.href = `/track?order_number=${order.order_number}&phone=${order.customer_phone}`;
  }

  document.getElementById('orderConfirmationModal').classList.remove('hidden');
}

function closeConfirmationModal() {
  document.getElementById('orderConfirmationModal').classList.add('hidden');
}

function showWishlistToast(e) {
  if (e) e.preventDefault();
  showToast('Wishlist synchronized with your cuddle profile.');
}
