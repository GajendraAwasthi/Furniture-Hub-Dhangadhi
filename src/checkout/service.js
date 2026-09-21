import crypto from 'crypto';
import { getDb, withTransaction } from '../db/client.js';
import { getRedis } from '../auth/redis.js';
import { getCartDetails, clearCart } from '../cart/service.js';
import { getPaymentStrategy } from './payment-strategy.js';

/**
 * Generates a collision-resistant, human-friendly order reference.
 * Example: FH-20260920-8F3A2B
 */
export function generateOrderReference() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `FH-${datePart}-${randPart}`;
}

/**
 * Generates a server-computed order preview.
 * The client CANNOT alter or tamper with any calculated value.
 */
export async function generateOrderPreview({ userId, addressId, couponCode = null }) {
  if (!userId) throw new Error('Authentication required for checkout preview.');

  const db = await getDb();

  // 1. Locate user cart
  const cartRes = await db.query('SELECT id FROM carts WHERE user_id = $1;', [userId]);
  if (cartRes.rows.length === 0) {
    throw new Error('No active cart found for this user.');
  }
  const cartId = cartRes.rows[0].id;

  // 2. Compute server-side cart details
  const cart = await getCartDetails(cartId, couponCode);
  if (cart.items.length === 0) {
    throw new Error('Cannot checkout: Your cart is empty.');
  }

  // 3. Validate shipping address if provided
  let address = null;
  if (addressId) {
    const addrRes = await db.query(
      `SELECT id, recipient_name, phone, address_line1, address_line2, city, state, postal_code, landmark 
       FROM addresses 
       WHERE id = $1 AND user_id = $2;`,
      [addressId, userId]
    );
    if (addrRes.rows.length === 0) {
      throw new Error('Selected delivery address not found.');
    }
    address = addrRes.rows[0];
  } else {
    // Pick default address
    const defaultAddrRes = await db.query(
      `SELECT id, recipient_name, phone, address_line1, address_line2, city, state, postal_code, landmark 
       FROM addresses 
       WHERE user_id = $1 
       ORDER BY is_default DESC, created_at DESC 
       LIMIT 1;`,
      [userId]
    );
    if (defaultAddrRes.rows.length > 0) {
      address = defaultAddrRes.rows[0];
    }
  }

  return {
    cartId,
    items: cart.items,
    itemCount: cart.itemCount,
    subtotalMinor: cart.subtotalMinor,
    deliveryFeeMinor: cart.deliveryFeeMinor,
    discountMinor: cart.discountMinor,
    totalMinor: cart.totalMinor,
    appliedCoupon: cart.appliedCoupon,
    shippingAddress: address
  };
}

/**
 * Confirms and places the order in a single ACID transaction.
 * 
 * Protections:
 * 1. Idempotency Key: Guarantees double-clicks or retries return the same order.
 * 2. Total Tampering Check: Rejects requests attempting to modify prices or totals.
 * 3. Row-Level Locking (SELECT ... FOR UPDATE): Prevents concurrent overselling.
 * 4. Frozen Item Snapshot: Captures product name, SKU, and unit price in minor units.
 */
export async function confirmOrder({
  userId,
  addressId,
  paymentMethod = 'cod',
  couponCode = null,
  idempotencyKey = null,
  clientSuppliedTotal = null
}) {
  if (!userId) throw new Error('Authentication required to place an order.');
  if (!addressId) throw new Error('Delivery address is required.');

  const redis = getRedis();

  // 1. Idempotency Key Guard
  let idempotencyRedisKey = null;
  if (idempotencyKey) {
    idempotencyRedisKey = `idempotency:order:${userId}:${idempotencyKey}`;
    const cachedOrder = await redis.get(idempotencyRedisKey);
    if (cachedOrder) {
      return JSON.parse(cachedOrder);
    }
  }

  // 2. Generate and verify preview
  const preview = await generateOrderPreview({ userId, addressId, couponCode });

  // 3. Reject Tampered Total
  if (clientSuppliedTotal !== null && clientSuppliedTotal !== undefined) {
    const clientVal = Number(clientSuppliedTotal);
    if (clientVal !== preview.totalMinor) {
      throw new Error(`Payment total mismatch: Server computed Rs. ${(preview.totalMinor / 100).toLocaleString()} (${preview.totalMinor} minor units), but client submitted ${clientVal}. Order rejected to protect transaction integrity.`);
    }
  }

  const paymentStrategy = getPaymentStrategy(paymentMethod);
  const db = await getDb();

  // 4. Single ACID Transaction
  const createdOrder = await withTransaction(async (tx) => {
    // A. Row-level lock and revalidate all items
    const productIds = preview.items.map(i => i.productId);
    const lockRes = await tx.query(
      `SELECT i.product_id, i.available_quantity, i.reserved_quantity, p.name, p.is_active, p.price_minor, p.sku
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.product_id = ANY($1)
       FOR UPDATE;`,
      [productIds]
    );

    const inventoryMap = new Map();
    for (const row of lockRes.rows) {
      inventoryMap.set(row.product_id, {
        available: parseInt(row.available_quantity, 10),
        reserved: parseInt(row.reserved_quantity, 10),
        isActive: row.is_active,
        name: row.name,
        sku: row.sku,
        priceMinor: BigInt(row.price_minor)
      });
    }

    // Verify stock availability
    for (const item of preview.items) {
      const inv = inventoryMap.get(item.productId);
      if (!inv || !inv.isActive) {
        throw new Error(`Product "${item.name}" is no longer active.`);
      }

      // If stock was reserved during cart addition, total physical units = available + reserved
      const totalPhysicalStock = inv.available + inv.reserved;
      if (totalPhysicalStock < item.quantity) {
        throw new Error(`Overselling prevention: Product "${item.name}" has insufficient stock (required: ${item.quantity}, available: ${totalPhysicalStock}).`);
      }

      // Decrement inventory to finalize order deduction
      // If reserved >= item.quantity, deduct from reserved; otherwise deduct from available
      let deductReserved = Math.min(inv.reserved, item.quantity);
      let deductAvailable = item.quantity - deductReserved;

      await tx.query(
        `UPDATE inventory 
         SET available_quantity = available_quantity - $1, 
             reserved_quantity = reserved_quantity - $2, 
             updated_at = NOW() 
         WHERE product_id = $3;`,
        [deductAvailable, deductReserved, item.productId]
      );
    }

    // B. Generate unique collision-resistant order reference
    let orderRef;
    let collisionAttempts = 0;
    while (!orderRef) {
      const candidateRef = generateOrderReference();
      const refCheck = await tx.query('SELECT id FROM orders WHERE reference = $1;', [candidateRef]);
      if (refCheck.rows.length === 0) {
        orderRef = candidateRef;
      } else {
        collisionAttempts++;
        if (collisionAttempts > 5) throw new Error('Failed to generate unique order reference');
      }
    }

    // C. Process Payment via PaymentStrategy
    const paymentResult = await paymentStrategy.processPayment({
      orderRef,
      amountMinor: BigInt(preview.totalMinor),
      customer: { userId }
    });

    const orderId = `ord-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    // D. Insert into orders table
    await tx.query(
      `INSERT INTO orders (id, reference, user_id, shipping_address_id, status, subtotal_minor, delivery_fee_minor, discount_minor, total_minor, payment_method, payment_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'PLACED', $5, $6, $7, $8, $9, $10, NOW(), NOW());`,
      [
        orderId,
        orderRef,
        userId,
        addressId,
        preview.subtotalMinor,
        preview.deliveryFeeMinor,
        preview.discountMinor,
        preview.totalMinor,
        paymentResult.paymentMethod,
        paymentResult.paymentStatus
      ]
    );

    // E. Insert order items with frozen snapshots
    for (const item of preview.items) {
      const oiId = `oi-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      await tx.query(
        `INSERT INTO order_items (id, order_id, product_id, product_name_snapshot, sku_snapshot, unit_price_minor_snapshot, quantity, line_total_minor, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
        [
          oiId,
          orderId,
          item.productId,
          item.name,
          item.sku,
          item.unitPriceMinor,
          item.quantity,
          item.lineTotalMinor,
          item.color || null
        ]
      );
    }

    // F. Record initial status history
    const historyId = `osh-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    await tx.query(
      `INSERT INTO order_status_history (id, order_id, from_status, to_status, notes)
       VALUES ($1, $2, NULL, 'PLACED', 'Order placed by customer via multi-step checkout');`,
      [historyId, orderId]
    );

    // G. Clear the user's cart items (without releasing inventory, since it is now purchased)
    await tx.query('DELETE FROM cart_items WHERE cart_id = $1;', [preview.cartId]);

    return {
      orderId,
      orderRef,
      status: 'PLACED',
      totalMinor: preview.totalMinor,
      subtotalMinor: preview.subtotalMinor,
      deliveryFeeMinor: preview.deliveryFeeMinor,
      discountMinor: preview.discountMinor,
      paymentMethod: paymentResult.paymentMethod,
      paymentStatus: paymentResult.paymentStatus,
      items: preview.items,
      shippingAddress: preview.shippingAddress,
      createdAt: new Date().toISOString()
    };
  });

  // Store in Redis with Idempotency Key (24 hours TTL)
  if (idempotencyRedisKey) {
    await redis.set(idempotencyRedisKey, JSON.stringify(createdOrder), 'EX', 86400);
  }

  return createdOrder;
}
