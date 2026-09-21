/**
 * Client-Side WhatsApp Order Handoff Service
 * Implements strict 1800-character ceiling, progressive truncation,
 * and builds server-authoritative WhatsApp deep-links for placed orders.
 */

export const WHATSAPP_CONFIG = {
  maxUrlLength: 1800,
  defaultSellerNumber: '9779841234567', // E.164 without '+'
  maxItemsBeforeTruncate: 8
};

export function normalizeWhatsAppNumber(number) {
  if (!number) return WHATSAPP_CONFIG.defaultSellerNumber;
  let clean = String(number).replace(/[^0-9]/g, '');
  // If 10 digits Nepal mobile (starts with 98 or 97), prepend Nepal country code 977
  if (clean.length === 10 && (clean.startsWith('98') || clean.startsWith('97'))) {
    clean = '977' + clean;
  }
  return clean || WHATSAPP_CONFIG.defaultSellerNumber;
}

export function getSellerNumber() {
  // 1. Check Admin-configured WhatsApp number in localStorage
  if (typeof localStorage !== 'undefined') {
    const adminNum = localStorage.getItem('fh_seller_whatsapp');
    if (adminNum && adminNum.trim()) {
      return normalizeWhatsAppNumber(adminNum);
    }
    // Check saved local settings
    try {
      const stored = localStorage.getItem('fh_local_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.whatsappNumber && parsed.whatsappNumber.trim()) {
          return normalizeWhatsAppNumber(parsed.whatsappNumber);
        }
      }
    } catch { /* ignore */ }
  }

  // 2. Fall back to environment configuration or default
  const envNum = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SELLER_WHATSAPP_NUMBER) ||
                 (typeof process !== 'undefined' && process.env && (process.env.SELLER_WHATSAPP_NUMBER || process.env.SELLER_NUMBER));
  const raw = envNum || WHATSAPP_CONFIG.defaultSellerNumber;
  return normalizeWhatsAppNumber(raw);
}

export function setSellerNumber(number) {
  if (typeof localStorage !== 'undefined' && number) {
    const clean = normalizeWhatsAppNumber(number);
    if (clean) {
      localStorage.setItem('fh_seller_whatsapp', clean);
      return clean;
    }
  }
  return null;
}

export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString()}/-`;
}

/**
 * Builds the WhatsApp notification message text.
 */
export function buildWhatsAppMessage(order, items = [], address = {}, options = {}) {
  const appBaseUrl = (typeof window !== 'undefined' && window.location ? window.location.origin : '') || 'https://furniturehub.com.np';
  const adminOrderUrl = `${appBaseUrl}/#admin/orders?ref=${encodeURIComponent(order.reference || order.id)}`;

  const totalItemsCount = items.length;
  const shouldTruncate = totalItemsCount > WHATSAPP_CONFIG.maxItemsBeforeTruncate || options.forceTruncate;
  const displayItems = shouldTruncate ? items.slice(0, WHATSAPP_CONFIG.maxItemsBeforeTruncate) : items;

  const itemLines = displayItems.map((item, idx) => {
    const name = item.product?.name || item.name || item.product_name_snapshot || 'Furniture Item';
    const qty = item.quantity || 1;
    const price = item.product?.price || item.price || item.unitPrice || 0;
    const lineTotal = formatCurrency(price * qty);
    return `${idx + 1}. ${name} x${qty} — ${lineTotal}`;
  });

  if (shouldTruncate) {
    const remaining = totalItemsCount - WHATSAPP_CONFIG.maxItemsBeforeTruncate;
    itemLines.push(`...and ${remaining} more items — see full order at the link above.`);
  }

  const customerName = order.name || order.customer_name || address.recipient_name || 'Valued Customer';
  const customerPhone = order.phone || order.customer_phone || address.phone || 'N/A';
  const deliveryAddress = order.address || order.delivery_address || address.address_line1 || 'Dhangadhi, Kailali, Nepal';

  const subtotal = order.subtotal || order.total || 0;
  const deliveryFee = order.delivery_fee || order.deliveryFee || 0;
  const total = order.total || order.total_amount || 0;

  const placedIso = order.created_at || new Date().toISOString();

  const msg = [
    `Furniture Hub Dhangadhi - Order #${order.reference || order.id}`,
    `----------------------`,
    `Customer: ${customerName} (${customerPhone})`,
    `Items:`,
    ...itemLines,
    `----------------------`,
    `Subtotal: ${formatCurrency(subtotal)}`,
    `Delivery: ${deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Standard Delivery (Confirmed on Dispatch)'}`,
    `TOTAL: ${formatCurrency(total)}`,
    `Deliver to:`,
    deliveryAddress,
    `Placed: ${placedIso}`,
    `View full order: ${adminOrderUrl}`
  ].join('\n');

  return msg;
}

/**
 * Generates the WhatsApp deep link adhering strictly to the 1800 character ceiling.
 */
export function generateWhatsAppLink(order, items = [], address = {}) {
  const sellerNumber = getSellerNumber();
  const baseUrl = `https://wa.me/${sellerNumber}?text=`;

  // First pass: standard message with 8-item threshold if needed
  let message = buildWhatsAppMessage(order, items, address, { forceTruncate: false });
  let encodedUrl = baseUrl + encodeURIComponent(message);

  // If over 1800, force truncation
  if (encodedUrl.length > WHATSAPP_CONFIG.maxUrlLength) {
    message = buildWhatsAppMessage(order, items, address, { forceTruncate: true });
    encodedUrl = baseUrl + encodeURIComponent(message);
  }

  // Safety fallback for extremely long addresses or order links
  if (encodedUrl.length > WHATSAPP_CONFIG.maxUrlLength) {
    const compactItems = items.slice(0, 3).map((item, idx) => {
      const name = item.product?.name || item.name || 'Item';
      return `${idx + 1}. ${name} x${item.quantity || 1}`;
    });
    compactItems.push(`...and ${items.length - 3} more items — see full order at the link above.`);

    const customerName = order.name || address.recipient_name || 'Customer';
    const customerPhone = order.phone || address.phone || '';
    const total = order.total || 0;
    const appBaseUrl = (typeof window !== 'undefined' && window.location ? window.location.origin : '') || 'https://furniturehub.com.np';
    const adminOrderUrl = `${appBaseUrl}/#admin/orders?ref=${encodeURIComponent(order.reference || order.id)}`;

    const fallbackMsg = [
      `New Order #${order.reference || order.id}`,
      `Customer: ${customerName} (${customerPhone})`,
      `Items:`,
      ...compactItems,
      `TOTAL: ${formatCurrency(total)}`,
      `Deliver to: ${order.address || address.city || 'Kathmandu'}`,
      `View full order: ${adminOrderUrl}`
    ].join('\n');

    encodedUrl = baseUrl + encodeURIComponent(fallbackMsg);
  }

  // Absolute hard cutoff at 1800 characters
  if (encodedUrl.length > WHATSAPP_CONFIG.maxUrlLength) {
    encodedUrl = encodedUrl.slice(0, WHATSAPP_CONFIG.maxUrlLength);
  }

  return {
    url: encodedUrl,
    length: encodedUrl.length,
    sellerNumber
  };
}
