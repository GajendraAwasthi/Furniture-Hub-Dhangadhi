import crypto from 'crypto';
import { getDb, withTransaction } from '../db/client.js';
import { getRedis } from '../auth/redis.js';
import { getCartDetails, clearCart } from '../cart/service.js';
import { getPaymentStrategy } from './payment-strategy.js';
import { invalidateCatalogCache } from '../catalog/service.js';

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
  clientSuppliedTotal = null,
  preview: customPreview = null
}) {
  if (!userId) throw new Error('Authentication required to place an order.');
  if (!addressId) throw new Error('Delivery address is required.');

  const redis = getRedis();

  // 1. Idempotency Key Guard: Claim atomically with Redis SET NX and a TTL before transaction
  let idempotencyRedisKey = null;
  let claimedIdempotency = false;

  if (idempotencyKey) {
    idempotencyRedisKey = `idempotency:order:${userId}:${idempotencyKey}`;
    const cachedOrder = await redis.get(idempotencyRedisKey);
    if (cachedOrder && cachedOrder !== 'IN_PROGRESS') {
      try {
        return JSON.parse(cachedOrder);
      } catch {
        // continue if corrupt
      }
    }

    const claimed = await redis.set(idempotencyRedisKey, 'IN_PROGRESS', 'EX', 120, 'NX');
    if (!claimed) {
      const current = await redis.get(idempotencyRedisKey);
      if (current && current !== 'IN_PROGRESS') {
        try {
          return JSON.parse(current);
        } catch {
          // ignore
        }
      }
      throw new Error('An order with this idempotency key is already in progress.');
    }
    claimedIdempotency = true;
  }

  try {
    // 2. Generate and verify preview
    const preview = customPreview || await generateOrderPreview({ userId, addressId, couponCode });

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
          priceMinor: Number(row.price_minor)
        });
      }

      // Verify stock availability and compare locked price_minor values with the preview
      for (const item of preview.items) {
        const inv = inventoryMap.get(item.productId);
        if (!inv || !inv.isActive) {
          throw new Error(`Product "${item.name}" is no longer active.`);
        }

        // Compare locked price_minor values with preview (reject changed price)
        const lockedPrice = Number(inv.priceMinor);
        const previewPrice = Number(item.unitPriceMinor);
        if (lockedPrice !== previewPrice) {
          throw new Error(`Price mismatch for product "${item.name}": preview price was ${previewPrice} minor units, but current price is ${lockedPrice} minor units. Order rejected to protect transaction integrity.`);
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

      // Recalculate totals and snapshots from locked rows
      let recalculatedSubtotalMinor = 0n;
      for (const item of preview.items) {
        const inv = inventoryMap.get(item.productId);
        const unitPrice = inv ? BigInt(inv.priceMinor) : BigInt(item.unitPriceMinor);
        recalculatedSubtotalMinor += unitPrice * BigInt(item.quantity);
      }
      const recalculatedDeliveryFeeMinor = recalculatedSubtotalMinor > 0n ? 50000n : 0n;
      let recalculatedDiscountMinor = 0n;
      if (preview.appliedCoupon && preview.appliedCoupon.discountPercent > 0) {
        const pct = BigInt(preview.appliedCoupon.discountPercent);
        recalculatedDiscountMinor = (recalculatedSubtotalMinor * pct) / 100n;
      }
      const recalculatedTotalMinor = recalculatedSubtotalMinor - recalculatedDiscountMinor + recalculatedDeliveryFeeMinor;


      if (clientSuppliedTotal !== null && clientSuppliedTotal !== undefined) {
        const clientVal = Number(clientSuppliedTotal);
        if (clientVal !== Number(recalculatedTotalMinor)) {
          throw new Error(`Payment total mismatch: Server computed Rs. ${(recalculatedTotalMinor / 100n).toLocaleString()} (${recalculatedTotalMinor} minor units), but client submitted ${clientVal}. Order rejected to protect transaction integrity.`);
        }
      }

      // C. Process Payment via PaymentStrategy
      const paymentResult = await paymentStrategy.processPayment({
        orderRef,
        amountMinor: recalculatedTotalMinor,
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
          Number(recalculatedSubtotalMinor),
          Number(recalculatedDeliveryFeeMinor),
          Number(recalculatedDiscountMinor),
          Number(recalculatedTotalMinor),
          paymentResult.paymentMethod,
          paymentResult.paymentStatus
        ]
      );

      // E. Insert order items with frozen snapshots (from locked rows)
      for (const item of preview.items) {
        const inv = inventoryMap.get(item.productId);
        const oiId = `oi-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        const unitPrice = inv ? inv.priceMinor : item.unitPriceMinor;
        await tx.query(
          `INSERT INTO order_items (id, order_id, product_id, product_name_snapshot, sku_snapshot, unit_price_minor_snapshot, quantity, line_total_minor, color)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
          [
            oiId,
            orderId,
            item.productId,
            inv ? inv.name : item.name,
            inv ? inv.sku : item.sku,
            unitPrice,
            item.quantity,
            unitPrice * item.quantity,
            item.color || ''
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
        totalMinor: Number(recalculatedTotalMinor),
        subtotalMinor: Number(recalculatedSubtotalMinor),
        deliveryFeeMinor: Number(recalculatedDeliveryFeeMinor),
        discountMinor: Number(recalculatedDiscountMinor),
        paymentMethod: paymentResult.paymentMethod,
        paymentStatus: paymentResult.paymentStatus,
        items: preview.items,
        shippingAddress: preview.shippingAddress,
        createdAt: new Date().toISOString()
      };
    });

    // Invalidate catalog cache after checkout stock mutations
    await invalidateCatalogCache();

    // Store in Redis with Idempotency Key (24 hours TTL)
    if (idempotencyRedisKey) {
      await redis.set(idempotencyRedisKey, JSON.stringify(createdOrder), 'EX', 86400);
    }

    return createdOrder;
  } catch (err) {
    // Release the claim on failure so retries can proceed
    if (idempotencyRedisKey && claimedIdempotency) {
      try {
        await redis.del(idempotencyRedisKey);
      } catch (delErr) {
        console.warn('Failed to release idempotency claim:', delErr.message);
      }
    }
    throw err;
  }
}
