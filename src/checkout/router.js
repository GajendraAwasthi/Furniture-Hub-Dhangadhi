import { requireAuth } from '../auth/middleware.js';
import { generateOrderPreview, confirmOrder } from './service.js';
import { createAddress, getUserAddresses, setDefaultAddress } from './address-service.js';

export async function handleCheckoutRequest(req) {
  const method = (req.method || 'GET').toUpperCase();
  const url = req.url || '/';
  const [path, queryString] = url.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryString || ''));

  // Mandatory Authentication Check: Guest checkout is strictly gated
  await requireAuth(req);

  // 1. GET /api/checkout/addresses — List user addresses
  if (method === 'GET' && path === '/api/checkout/addresses') {
    const addresses = await getUserAddresses(req.user.id);
    return { status: 200, body: { addresses } };
  }

  // 2. POST /api/checkout/addresses — Add new address
  if (method === 'POST' && path === '/api/checkout/addresses') {
    try {
      const address = await createAddress(req.user.id, req.body || {});
      return { status: 201, body: { success: true, address } };
    } catch (err) {
      return { status: 400, body: { error: err.message } };
    }
  }

  // 3. PUT /api/checkout/addresses/:id/default — Set default address
  if (method === 'PUT' && path.endsWith('/default')) {
    const parts = path.split('/');
    const addressId = parts[parts.length - 2];
    try {
      const res = await setDefaultAddress(req.user.id, addressId);
      return { status: 200, body: res };
    } catch (err) {
      return { status: 400, body: { error: err.message } };
    }
  }

  // 4. POST /api/checkout/preview — Server-computed order preview
  if (method === 'POST' && path === '/api/checkout/preview') {
    const { addressId, couponCode } = req.body || {};
    try {
      const preview = await generateOrderPreview({
        userId: req.user.id,
        addressId,
        couponCode
      });
      return { status: 200, body: preview };
    } catch (err) {
      return { status: 400, body: { error: err.message } };
    }
  }

  // 5. POST /api/checkout/confirm — Order confirmation & commit
  if (method === 'POST' && path === '/api/checkout/confirm') {
    const idempotencyKey = req.headers?.['idempotency-key'] || req.headers?.['Idempotency-Key'] || req.body?.idempotencyKey || null;
    const { addressId, paymentMethod, couponCode, clientSuppliedTotal } = req.body || {};

    try {
      const order = await confirmOrder({
        userId: req.user.id,
        addressId,
        paymentMethod: paymentMethod || 'cod',
        couponCode,
        idempotencyKey,
        clientSuppliedTotal
      });
      return { status: 201, body: { success: true, order } };
    } catch (err) {
      return { status: 400, body: { error: err.message } };
    }
  }

  return { status: 404, body: { error: 'Endpoint not found' } };
}
