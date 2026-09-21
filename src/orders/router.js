import { requireAuth } from '../auth/middleware.js';
import { getWhatsAppLinkForOrder } from './whatsapp-service.js';
import { getDb } from '../db/client.js';

/**
 * Orders HTTP Request Handler
 * Handles order-related queries and WhatsApp notification link generation.
 */
export async function handleOrdersRequest(req) {
  const method = (req.method || 'GET').toUpperCase();
  const url = req.url || '/';
  const [path, queryString] = url.split('?');

  // Mandatory Authentication Check: Gated to authenticated users / admins
  await requireAuth(req);

  // 1. GET /api/orders/:orderRef/whatsapp-link — Server-generated authorized WhatsApp deep-link
  const waMatch = path.match(/^\/api\/orders\/([A-Za-z0-9\-]+)\/whatsapp-link$/);
  if (method === 'GET' && waMatch) {
    const orderRef = waMatch[1];
    try {
      const linkData = await getWhatsAppLinkForOrder(orderRef, req.user);
      return { status: 200, body: linkData };
    } catch (err) {
      const status = err.status || 500;
      return { status, body: { error: err.message, code: err.code || 'ERROR' } };
    }
  }

  // 2. GET /api/orders/:orderRef — Fetch order details (for Order Success / Tracking)
  const orderMatch = path.match(/^\/api\/orders\/([A-Za-z0-9\-]+)$/);
  if (method === 'GET' && orderMatch) {
    const orderRef = orderMatch[1];
    const db = await getDb();

    const orderRes = await db.query(
      `SELECT id, reference, user_id, shipping_address_id, status, subtotal_minor, delivery_fee_minor, total_minor, payment_method, created_at
       FROM orders
       WHERE reference = $1;`,
      [orderRef]
    );

    if (orderRes.rows.length === 0) {
      return { status: 404, body: { error: `Order #${orderRef} not found.` } };
    }

    const order = orderRes.rows[0];

    // Ownership verification (IDOR protection)
    const isOwner = order.user_id === req.user.id;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN';
    if (!isOwner && !isAdmin) {
      return { status: 403, body: { error: 'Access denied: You are not authorized to view this order.', code: 'FORBIDDEN' } };
    }

    const itemsRes = await db.query(
      `SELECT product_name_snapshot, sku_snapshot, unit_price_minor_snapshot, quantity, line_total_minor
       FROM order_items
       WHERE order_id = $1
       ORDER BY id ASC;`,
      [order.id]
    );

    return {
      status: 200,
      body: {
        order: {
          ...order,
          items: itemsRes.rows
        }
      }
    };
  }

  return { status: 404, body: { error: 'Endpoint not found' } };
}
