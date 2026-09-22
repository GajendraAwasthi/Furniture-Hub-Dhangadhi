import { getDb } from '../db/client.js';

export const WHATSAPP_CONFIG = {
  maxUrlLength: 1800,
  defaultSellerNumber: '9779841234567', // E.164 without leading '+'
  maxItemsBeforeTruncate: 8
};

export function getSellerNumber() {
  const raw = process.env.SELLER_WHATSAPP_NUMBER || process.env.SELLER_NUMBER || WHATSAPP_CONFIG.defaultSellerNumber;
  return raw.replace(/[^0-9]/g, '');
}

export function formatCurrency(minorUnits) {
  const num = Number(minorUnits) / 100;
  return `Rs. ${num.toLocaleString()}`;
}

/**
 * Generates the WhatsApp order message strictly server-side from database records.
 * NEVER built from client state.
 */
export function buildWhatsAppMessage(order, items, address, options = {}) {
  const appBaseUrl = process.env.APP_BASE_URL || 'https://furniturehub.com.np';
  const trackOrderUrl = `${appBaseUrl}/#track?ref=${encodeURIComponent(order.reference)}`;

  const totalItemsCount = items.length;
  const shouldTruncate = totalItemsCount > WHATSAPP_CONFIG.maxItemsBeforeTruncate || options.forceTruncate;
  const displayItems = shouldTruncate ? items.slice(0, WHATSAPP_CONFIG.maxItemsBeforeTruncate) : items;

  const itemLines = displayItems.map((item, idx) => {
    const lineTotal = formatCurrency(item.line_total_minor);
    return `${idx + 1}. ${item.product_name_snapshot} x${item.quantity} — ${lineTotal}`;
  });

  if (shouldTruncate) {
    const remaining = totalItemsCount - WHATSAPP_CONFIG.maxItemsBeforeTruncate;
    itemLines.push(`...and ${remaining} more items — see full order at the link above.`);
  }

  const addrLines = [
    address.address_line1 + (address.address_line2 ? `, ${address.address_line2}` : ''),
    `${address.city}${address.state ? `, ${address.state}` : ''}${address.postal_code ? ` ${address.postal_code}` : ''}`
  ];
  if (address.landmark) {
    addrLines.push(`Landmark: ${address.landmark}`);
  }

  const placedIso = new Date(order.created_at).toISOString();

  const msg = [
    `Furniture Hub Dhangadhi - Order #${order.reference}`,
    `----------------------`,
    `Customer: ${address.recipient_name} (${address.phone})`,
    `Items:`,
    ...itemLines,
    `----------------------`,
    `Subtotal: ${formatCurrency(order.subtotal_minor)}`,
    `Delivery: ${order.delivery_fee_minor > 0 ? formatCurrency(order.delivery_fee_minor) : 'Standard Delivery'}`,
    `TOTAL: ${formatCurrency(order.total_minor)}`,
    `Order Channel: ${order.payment_method || 'WhatsApp Direct'}`,
    `Deliver to:`,
    ...addrLines,
    `Placed: ${placedIso}`,
    `Track your order: ${trackOrderUrl}`
  ].join('\n');

  return msg;
}

/**
 * Fits an encoded URL within maxUrlLength by safely truncating unencoded source text
 */
function fitEncodedUrl(baseUrl, message, maxUrlLength = WHATSAPP_CONFIG.maxUrlLength) {
  let encoded = baseUrl + encodeURIComponent(message);
  if (encoded.length <= maxUrlLength) return encoded;

  const characters = Array.from(message);
  let low = 0;
  let high = characters.length;
  let best = baseUrl;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const sub = characters.slice(0, mid).join('');
    const testUrl = baseUrl + encodeURIComponent(sub);
    if (testUrl.length <= maxUrlLength) {
      best = testUrl;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

/**
 * Generates the WhatsApp deep-link URL and enforces the 1800 character ceiling.
 * Format: https://wa.me/<SELLER_NUMBER_E164_NO_PLUS>?text=<encodeURIComponent(msg)>
 */
export function generateWhatsAppDeepLink(order, items, address) {
  const sellerNumber = getSellerNumber();
  const baseUrl = `https://wa.me/${sellerNumber}?text=`;

  // First attempt: standard message with 8-item threshold if needed
  let message = buildWhatsAppMessage(order, items, address, { forceTruncate: false });
  let encodedUrl = baseUrl + encodeURIComponent(message);

  // If encoded URL exceeds 1800 characters, force truncation to 8 items or compact further
  if (encodedUrl.length > WHATSAPP_CONFIG.maxUrlLength) {
    message = buildWhatsAppMessage(order, items, address, { forceTruncate: true });
    encodedUrl = baseUrl + encodeURIComponent(message);
  }

  // Safety fallback: if still exceeding 1800 characters due to long addresses, progressively truncate items
  if (encodedUrl.length > WHATSAPP_CONFIG.maxUrlLength) {
    const compactItems = items.slice(0, 3);
    const compactLines = compactItems.map((item, idx) => `${idx + 1}. ${item.product_name_snapshot} x${item.quantity}`);
    compactLines.push(`...and ${items.length - 3} more items — see full order at the link above.`);

    const placedIso = new Date(order.created_at).toISOString();
    const appBaseUrl = process.env.APP_BASE_URL || 'https://furniturehub.com.np';
    const trackOrderUrl = `${appBaseUrl}/#track?ref=${encodeURIComponent(order.reference)}`;

    message = [
      `New Order #${order.reference}`,
      `Customer: ${address.recipient_name} (${address.phone})`,
      `Items:`,
      ...compactLines,
      `TOTAL: ${formatCurrency(order.total_minor)}`,
      `Deliver to: ${address.city}`,
      `Placed: ${placedIso}`,
      `Track order live: ${trackOrderUrl}`
    ].join('\n');
  }

  // Safe encoding fit preventing broken % escapes or malformed URIs
  encodedUrl = fitEncodedUrl(baseUrl, message, WHATSAPP_CONFIG.maxUrlLength);

  return {
    url: encodedUrl,
    length: encodedUrl.length,
    sellerNumber
  };
}

/**
 * Service function to retrieve order from DB and generate authorized WhatsApp link.
 * Verifies that the order exists in the database first.
 */
export async function getWhatsAppLinkForOrder(orderRef, user) {
  if (!user) {
    const err = new Error('Authentication required to retrieve WhatsApp order link.');
    err.status = 401;
    throw err;
  }

  const db = await getDb();

  // 1. Fetch order from DB
  const orderRes = await db.query(
    `SELECT id, reference, user_id, shipping_address_id, status, subtotal_minor, delivery_fee_minor, total_minor, payment_method, created_at
     FROM orders
     WHERE reference = $1;`,
    [orderRef]
  );

  if (orderRes.rows.length === 0) {
    const err = new Error(`Order #${orderRef} does not exist in database.`);
    err.status = 404;
    throw err;
  }

  const order = orderRes.rows[0];

  // 2. Ownership verification (IDOR protection)
  const isOwner = order.user_id === user.id;
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
  if (!isOwner && !isAdmin) {
    const err = new Error('Access denied: You are not authorized to access this order.');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  // 3. Fetch order items
  const itemsRes = await db.query(
    `SELECT product_name_snapshot, sku_snapshot, unit_price_minor_snapshot, quantity, line_total_minor
     FROM order_items
     WHERE order_id = $1
     ORDER BY id ASC;`,
    [order.id]
  );

  // 4. Fetch delivery address
  const addrRes = await db.query(
    `SELECT recipient_name, phone, address_line1, address_line2, city, state, postal_code, landmark
     FROM addresses
     WHERE id = $1;`,
    [order.shipping_address_id]
  );

  const address = addrRes.rows[0] || {
    recipient_name: 'Valued Customer',
    phone: 'N/A',
    address_line1: 'Delivery Address',
    city: 'Kathmandu'
  };

  // 5. Generate link
  const linkData = generateWhatsAppDeepLink(order, itemsRes.rows, address);

  return {
    orderRef: order.reference,
    status: order.status,
    url: linkData.url,
    urlLength: linkData.length
  };
}
