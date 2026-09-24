import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCartTotals } from '../src/cart/pricing.js';
import { createOrder, fetchCoupons, fetchOrderByReference, setClientForTesting } from '../src/services/supabase.js';
import { renderCartDrawer } from '../src/components/cart-drawer.js';
import { renderNavbar } from '../src/components/navbar.js';
import { signCartSession, verifyCartSession } from '../src/cart/service.js';
import { singleFlight } from '../src/checkout/single-flight.js';

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
