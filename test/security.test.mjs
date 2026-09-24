import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCartTotals } from '../src/cart/pricing.js';
import { createOrder, fetchCoupons, fetchOrderByReference, setClientForTesting } from '../src/services/supabase.js';
import { renderCartDrawer } from '../src/components/cart-drawer.js';
import { renderNavbar } from '../src/components/navbar.js';
import { signCartSession, verifyCartSession } from '../src/cart/service.js';
import { singleFlight } from '../src/checkout/single-flight.js';
import { renderHomeView } from '../src/views/home-view.js';
import { renderProductDetailView } from '../src/views/product-detail-view.js';
import { renderUserProfileModal } from '../src/components/user-profile-modal.js';
import { renderAdminOverviewView } from '../src/views/admin/admin-overview-view.js';
import { renderAdminProductsView } from '../src/views/admin/admin-products-view.js';
import { renderAdminSettingsView } from '../src/views/admin/admin-settings-view.js';
import { generateWhatsAppLink, getSellerNumber, setSellerNumber, setCloudSellerNumber, syncSellerNumberFromCloud } from '../src/services/whatsapp.js';

const cart = [{ product: { price: 10000 }, quantity: 2 }];

test('cart preview honors the actual coupon and its minimum', () => {
  assert.deepEqual(calculateCartTotals(cart, { code: 'SAVE20', discountPercent: 20, minOrderAmount: 15000 }).total, 16500);
  assert.equal(calculateCartTotals(cart, { code: 'SAVE20', discountPercent: 20, minOrderAmount: 25000 }).total, 20500);
  assert.equal(calculateCartTotals(cart, { code: 'SAVE2000', discountFixed: 2000 }).total, 18500);
  assert.equal(calculateCartTotals(cart, { code: 'OLD', discountPercent: 20, expiryDate: '2020-01-01' }).total, 20500);
});

test('cart rendering escapes product and customer supplied markup', () => {
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  renderCartDrawer(container, {
    cart: [{ product: { id: '1', name: '<script>alert(1)</script>', image: '/images/hero-living-room.png', price: 10000 }, quantity: 1, color: '<img src=x>' }],
    customerUser: { name: '" onfocus="alert(1)', phone: '9800000000', address: '<script>bad</script>' },
    customerProfile: {}, couponApplied: false, isCartOpen: true, isCheckoutOpen: false, isReceiptOpen: false
  }, { emit: () => {} });
  assert.doesNotMatch(container.innerHTML, /<script>|<img src=x>|value="" onfocus=/);
  assert.match(container.innerHTML, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('navigation escapes customer names in text and attributes', () => {
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  renderNavbar(container, {
    cart: [], wishlist: [], products: [], customerUser: { name: '"><script>alert(1)</script>' }
  }, { emit: () => {} });
  assert.doesNotMatch(container.innerHTML, /<script>/);
  assert.match(container.innerHTML, /&lt;script&gt;/);
});

test('catalog and profile rendering escape stored text and attribute values', () => {
  const previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    key: index => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  };
  try {
    const payload = '\"><img src=x onerror=alert(1)>';
    const product = {
      id: 'test-chair', name: payload, category: payload, description: payload,
      image: `https://example.test/${payload}`, gallery: [`https://example.test/${payload}`],
      materials: payload, dimensions: payload, weight: payload,
      colors: [{ name: payload, hex: payload }], price: 1000, rating: 5, reviewCount: 0,
      isNewArrival: true, isBestSeller: false
    };
    values.set('fh_customer_reviews_v2', JSON.stringify([{
      productId: product.id, productName: payload, userName: payload,
      userAvatar: payload, rating: 5, comment: payload
    }]));
    const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
    const events = { emit: () => {} };
    const state = { products: [product], wishlist: [], customerUser: null };
    renderHomeView(container, state, events);
    assert.doesNotMatch(container.innerHTML, /<img src=x onerror=alert\(1\)>/);
    assert.match(container.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);

    renderProductDetailView(container, state, events, new URLSearchParams({ id: product.id }));
    assert.doesNotMatch(container.innerHTML, /<img src=x onerror=alert\(1\)>/);
    assert.match(container.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);

    values.set('fh_customer_session', JSON.stringify({ id: 'customer-1', email: 'customer@example.test', name: payload, role: 'customer' }));
    renderUserProfileModal(container, {
      customerUser: { id: 'customer-1', email: 'customer@example.test', name: payload },
      customerProfile: { name: payload, phone: payload, address: payload, city: 'Dhangadhi' },
      lastOrder: { id: payload, date: payload, whatsappUrl: 'javascript:alert(1)', total: 1000 },
      isProfileOpen: true
    }, events);
    assert.doesNotMatch(container.innerHTML, /<img src=x onerror=alert\(1\)>|javascript:alert/);
    assert.match(container.innerHTML, /value="&quot;&gt;&lt;img/);
  } finally {
    globalThis.localStorage = previousStorage;
  }
});

test('admin overview escapes customer supplied order fields', async () => {
  const payload = '\"><img src=x onerror=alert(1)>';
  const responses = {
    products: [{ id: 'chair', name: 'Chair', category: 'Seatings', price: 1000, image: '/chair.png' }],
    orders: [{
      id: payload, customer_name: payload, customer_phone: '9800000000',
      delivery_address: payload, payment_method: payload, status: 'Pending', total_amount: 1000
    }],
    store_settings: [{ value: { currency: 'Rs.' } }]
  };
  setClientForTesting({
    from: table => ({
      select: () => table === 'store_settings'
        ? Promise.resolve({ data: responses[table], error: null })
        : { order: async () => ({ data: responses[table], error: null }) }
    })
  });
  const container = { innerHTML: '', querySelectorAll: () => [] };
  await renderAdminOverviewView(container, {}, { emit: () => {} });
  assert.doesNotMatch(container.innerHTML, /<img src=x onerror=alert\(1\)>/);
  assert.match(container.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(container.innerHTML, /data-order-id="&quot;&gt;&lt;img/);
});

test('admin catalog and settings escape persisted values', async () => {
  const payload = '\"><img src=x onerror=alert(1)>';
  setClientForTesting({
    from: table => ({
      select: () => table === 'products'
        ? { order: async () => ({ data: [{ id: payload, name: payload, category: payload, price: 1000, image: payload }], error: null }) }
        : Promise.resolve({ data: table === 'store_settings' ? [{ value: { storeName: payload, currency: payload, lowStockThreshold: payload } }] : [], error: null })
    })
  });
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  await renderAdminProductsView(container, {}, { emit: () => {} });
  assert.doesNotMatch(container.innerHTML, /<img src=x onerror=alert\(1\)>/);
  await renderAdminSettingsView(container, {}, { emit: () => {} });
  assert.doesNotMatch(container.innerHTML, /<img src=x onerror=alert\(1\)>/);
  assert.match(container.innerHTML, /value="&quot;&gt;&lt;img/);
});

test('checkout uses the shared WhatsApp receiver across browser-local settings', async () => {
  const previousStorage = globalThis.localStorage;
  const values = new Map([['fh_seller_whatsapp', '9779800000000']]);
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
  setClientForTesting({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { value: { whatsappNumber: '9779811111111' } }, error: null }) })
      })
    })
  });
  try {
    await syncSellerNumberFromCloud();
    assert.equal(getSellerNumber(), '9779811111111');
    setSellerNumber('9779822222222');
    assert.equal(getSellerNumber(), '9779811111111');
    assert.match(generateWhatsAppLink({ id: 'FH-TEST', total: 1000 }).url, /^https:\/\/wa\.me\/9779811111111\?/);
    setCloudSellerNumber(null);
    setClientForTesting({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: new Error('network unavailable') }) }) }) }) });
    await assert.rejects(syncSellerNumberFromCloud(), /network unavailable/);
    assert.notEqual(getSellerNumber(), '9779822222222');
  } finally {
    setCloudSellerNumber(null);
    setClientForTesting(null);
    globalThis.localStorage = previousStorage;
  }
});

test('cart sessions require a private signing secret', () => {
  const previous = process.env.CART_SECRET;
  try {
    delete process.env.CART_SECRET;
    assert.throws(() => signCartSession('example'), /CART_SECRET must be configured/);
    process.env.CART_SECRET = 'local-test-secret-0123456789-abcdefgh';
    const signed = signCartSession('example');
    assert.equal(verifyCartSession(signed), 'example');
    assert.equal(verifyCartSession(signed.replace('example', 'tampered')), null);
  } finally {
    if (previous === undefined) delete process.env.CART_SECRET;
    else process.env.CART_SECRET = previous;
  }
});

test('checkout starts only one request while session verification is pending', async () => {
  let release;
  let calls = 0;
  const pending = new Promise(resolve => { release = resolve; });
  const placeOnce = singleFlight(async () => {
    calls++;
    await pending;
  });
  const first = placeOnce();
  await placeOnce();
  assert.equal(calls, 1);
  release();
  await first;
  await placeOnce();
  assert.equal(calls, 2);

  let attempts = 0;
  const retryable = singleFlight(async () => {
    if (++attempts === 1) throw new Error('session unavailable');
  });
  await assert.rejects(retryable(), /session unavailable/);
  await retryable();
  assert.equal(attempts, 2);
});

test('checkout refuses a missing authenticated session instead of creating a local order', async () => {
  setClientForTesting({ auth: { getSession: async () => ({ data: { session: null } }) } });
  await assert.rejects(createOrder({ items: cart }), /Please sign in/);
});

test('tracking does not expose cached orders after an RPC failure', async () => {
  setClientForTesting({ rpc: async () => ({ data: null, error: new Error('network unavailable') }) });
  await assert.rejects(fetchOrderByReference('FH-1', '9800000000'), /Unable to verify order tracking/);
});

test('tracking accepts the authorized RPC projection without customer PII', async () => {
  const projection = { id: 'FH-1', status: 'Shipped', customer_name_masked: 'Ra***' };
  setClientForTesting({ rpc: async () => ({ data: [projection], error: null }) });
  assert.deepEqual(await fetchOrderByReference('FH-1', '9800000000'), projection);
});

test('an empty remote coupon list stays empty and remote errors fail closed', async () => {
  setClientForTesting({ from: () => ({ select: async () => ({ data: [], error: null }) }) });
  assert.deepEqual(await fetchCoupons(), []);
  setClientForTesting({ from: () => ({ select: async () => ({ data: null, error: new Error('network unavailable') }) }) });
  await assert.rejects(fetchCoupons(), /network unavailable/);
});
