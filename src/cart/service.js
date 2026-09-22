import crypto from 'crypto';
import { getDb, withTransaction } from '../db/client.js';

const CART_SECRET = process.env.CART_SECRET || 'furniture-hub-cart-signing-secret-key-32b';
export const CART_CONFIG = {
  cookieName: 'fh_cart_session',
  maxQuantityPerItem: 99,
  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 30 * 24 * 3600 // 30 days
  }
};

/**
 * Signs a cart session token using HMAC-SHA256.
 */
export function signCartSession(rawToken) {
  const signature = crypto
    .createHmac('sha256', CART_SECRET)
    .update(rawToken)
    .digest('base64url');
  return `${rawToken}.${signature}`;
}

/**
 * Verifies and unpacks a signed cart session token.
 * Returns the rawToken if valid; null if tampered or missing.
 */
export function verifyCartSession(signedToken) {
  if (!signedToken || typeof signedToken !== 'string') return null;
  const parts = signedToken.split('.');
  if (parts.length !== 2) return null;

  const [rawToken, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', CART_SECRET)
    .update(rawToken)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  return rawToken;
}

/**
 * Resolves or creates a cart in the database.
 * If user is authenticated, resolves by user_id.
 * If anonymous, resolves by signed session_token.
 */
export async function getOrCreateCart({ userId = null, signedSessionToken = null }) {
  const db = await getDb();
  let rawSessionToken = verifyCartSession(signedSessionToken);
  let isNewSession = false;

  // 1. If user is authenticated, check for user cart
  if (userId) {
    const userCartRes = await db.query(
      `SELECT id, user_id, session_token FROM carts WHERE user_id = $1;`,
      [userId]
    );
    if (userCartRes.rows.length > 0) {
      return { cart: userCartRes.rows[0], signedCookie: null };
    }

    // Create user cart
    const cartId = `cart-usr-${userId}`;
    await db.query(
      `INSERT INTO carts (id, user_id) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING;`,
      [cartId, userId]
    );
    return { cart: { id: cartId, user_id: userId }, signedCookie: null };
  }

  // 2. Anonymous guest cart
  if (rawSessionToken) {
    const anonCartRes = await db.query(
      `SELECT id, user_id, session_token FROM carts WHERE session_token = $1;`,
      [rawSessionToken]
    );
    if (anonCartRes.rows.length > 0) {
      return { cart: anonCartRes.rows[0], signedCookie: null };
    }
  }

  // Generate new anonymous cart session
  rawSessionToken = `anon-sess-${crypto.randomBytes(16).toString('hex')}`;
  const newCartId = `cart-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  await db.query(
    `INSERT INTO carts (id, session_token) VALUES ($1, $2);`,
    [newCartId, rawSessionToken]
  );

  return {
    cart: { id: newCartId, session_token: rawSessionToken },
    signedCookie: signCartSession(rawSessionToken)
  };
}

/**
 * Retrieves the full cart with items and recomputes all monetary values server-side.
 * ZERO TRUST: All prices, subtotals, delivery fees, discounts and totals are
 * calculated strictly from the database.
 */
export async function getCartDetails(cartId, couponCode = null) {
  const db = await getDb();

  const res = await db.query(
    `SELECT 
       ci.id AS item_id,
       ci.product_id,
       ci.quantity,
       ci.selected_color,
       p.slug AS product_slug,
       p.sku AS product_sku,
       p.name AS product_name,
       p.price_minor,
       p.compare_at_price_minor,
       p.is_active,
       i.available_quantity,
       img.url AS primary_image_url
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     LEFT JOIN inventory i ON p.id = i.product_id
     LEFT JOIN product_images img ON p.id = img.product_id AND img.is_primary = true
     WHERE ci.cart_id = $1
     ORDER BY ci.created_at ASC;`,
    [cartId]
  );

  let subtotalMinor = 0n;
  const items = [];

  for (const row of res.rows) {
    const unitPrice = BigInt(row.price_minor);
    const qty = parseInt(row.quantity, 10);
    const lineTotal = unitPrice * BigInt(qty);
    subtotalMinor += lineTotal;

    items.push({
      id: row.item_id,
      productId: row.product_id,
      slug: row.product_slug,
      sku: row.product_sku,
      name: row.product_name,
      color: row.selected_color,
      quantity: qty,
      availableStock: row.available_quantity !== null ? parseInt(row.available_quantity, 10) : 0,
      unitPriceMinor: Number(unitPrice),
      compareAtPriceMinor: row.compare_at_price_minor ? Number(row.compare_at_price_minor) : null,
      lineTotalMinor: Number(lineTotal),
      image: row.primary_image_url || '/images/hero-living-room.png'
    });
  }

  // Delivery calculation: Standard delivery fee of Rs. 500 (50,000 minor units) for non-empty carts
  const STANDARD_DELIVERY_FEE = 50000n;
  const deliveryFeeMinor = subtotalMinor > 0n ? STANDARD_DELIVERY_FEE : 0n;

  // Discount calculation (server-side verified):
  let discountMinor = 0n;
  let appliedCoupon = null;
  if (couponCode) {
    const cleanCode = couponCode.trim().toUpperCase();
    if (cleanCode === 'HUB10') {
      discountMinor = (subtotalMinor * 10n) / 100n; // 10%
      appliedCoupon = { code: 'HUB10', discountPercent: 10 };
    }
  }

  const totalMinor = subtotalMinor - discountMinor + deliveryFeeMinor;

  return {
    cartId,
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotalMinor: Number(subtotalMinor),
    deliveryFeeMinor: Number(deliveryFeeMinor),
    discountMinor: Number(discountMinor),
    totalMinor: Number(totalMinor),
    appliedCoupon
  };
}

/**
 * Adds an item to the cart with row-level locking for inventory checks.
 * Bounds: 1..min(99, availableStock).
 * Rejects client-supplied prices.
 */
export async function addItemToCart(cartId, { productId, quantity = 1, color = '' }) {
  const reqQty = Math.max(1, parseInt(quantity, 10) || 1);
  const cleanColor = (color || '').trim();

  return await withTransaction(async (tx) => {
    // 1. Lock the inventory row for update (Row-Level Locking prevents concurrent overselling)
    const invRes = await tx.query(
      `SELECT i.available_quantity, i.reserved_quantity, p.is_active, p.price_minor
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.product_id = $1
       FOR UPDATE;`,
      [productId]
    );

    if (invRes.rows.length === 0) {
      throw new Error('Product not found or inventory unavailable.');
    }

    const { available_quantity, is_active } = invRes.rows[0];
    if (!is_active) {
      throw new Error('This product is currently inactive.');
    }

    const availableStock = parseInt(available_quantity, 10);
    if (availableStock <= 0) {
      throw new Error('This item is currently out of stock.');
    }

    // Check existing item in this cart
    const existingRes = await tx.query(
      `SELECT id, quantity 
       FROM cart_items 
       WHERE cart_id = $1 AND product_id = $2 AND (selected_color = $3 OR ($3 = '' AND selected_color IS NULL));`,
      [cartId, productId, cleanColor]
    );

    const currentQtyInCart = existingRes.rows.length > 0 ? parseInt(existingRes.rows[0].quantity, 10) : 0;

    // Strict bounds: 1..min(99, availableStock) on the aggregate cart item quantity
    const maxAllowed = Math.min(CART_CONFIG.maxQuantityPerItem, availableStock);
    const allowedToAdd = Math.max(0, maxAllowed - currentQtyInCart);
    if (allowedToAdd <= 0) {
      throw new Error(`Cannot add more. You already have the maximum allowed quantity (${CART_CONFIG.maxQuantityPerItem}) in your cart.`);
    }

    const qtyToAdd = Math.min(reqQty, allowedToAdd);
    const finalQty = currentQtyInCart + qtyToAdd;

    // Atomically reserve inventory under row lock
    await tx.query(
      `UPDATE inventory 
       SET available_quantity = available_quantity - $1, 
           reserved_quantity = reserved_quantity + $1, 
           updated_at = NOW() 
       WHERE product_id = $2;`,
      [qtyToAdd, productId]
    );

    if (existingRes.rows.length > 0) {
      await tx.query(
        `UPDATE cart_items 
         SET quantity = $1, updated_at = NOW() 
         WHERE id = $2;`,
        [finalQty, existingRes.rows[0].id]
      );
    } else {
      const itemId = `ci-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      await tx.query(
        `INSERT INTO cart_items (id, cart_id, product_id, quantity, selected_color)
         VALUES ($1, $2, $3, $4, $5);`,
        [itemId, cartId, productId, finalQty, cleanColor || null]
      );
    }

    return { success: true, clampedQty: finalQty, availableStock: availableStock - qtyToAdd };
  });
}

/**
 * Updates quantity of a specific cart item.
 * Clamps quantity to 1..min(99, availableStock).
 * If quantity <= 0, deletes item and releases reserved stock.
 */
export async function updateCartItemQuantity(cartId, itemId, newQuantity) {
  const targetQty = parseInt(newQuantity, 10);

  if (isNaN(targetQty) || targetQty <= 0) {
    return await removeCartItem(cartId, itemId);
  }

  return await withTransaction(async (tx) => {
    const itemRes = await tx.query(
      `SELECT ci.quantity, ci.product_id, i.available_quantity
       FROM cart_items ci
       JOIN inventory i ON ci.product_id = i.product_id
       WHERE ci.id = $1 AND ci.cart_id = $2
       FOR UPDATE;`,
      [itemId, cartId]
    );

    if (itemRes.rows.length === 0) {
      throw new Error('Cart item not found.');
    }

    const currentQty = parseInt(itemRes.rows[0].quantity, 10);
    const availableStock = parseInt(itemRes.rows[0].available_quantity, 10);
    const productId = itemRes.rows[0].product_id;

    // Maximum that can be in cart is currentQty + remaining available stock (capped at 99)
    const maxAllowed = Math.min(CART_CONFIG.maxQuantityPerItem, currentQty + availableStock);
    const clampedQty = Math.max(1, Math.min(targetQty, maxAllowed));
    const delta = clampedQty - currentQty;

    if (delta !== 0) {
      await tx.query(
        `UPDATE inventory 
         SET available_quantity = available_quantity - $1, 
             reserved_quantity = reserved_quantity + $1, 
             updated_at = NOW() 
         WHERE product_id = $2;`,
        [delta, productId]
      );

      await tx.query(
        `UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2;`,
        [clampedQty, itemId]
      );
    }

    return { success: true, quantity: clampedQty, clamped: clampedQty !== targetQty };
  });
}

/**
 * Removes an item from the cart and releases reserved stock back to available inventory.
 */
export async function removeCartItem(cartId, itemId) {
  return await withTransaction(async (tx) => {
    const itemRes = await tx.query(
      `SELECT product_id, quantity FROM cart_items WHERE id = $1 AND cart_id = $2;`,
      [itemId, cartId]
    );

    if (itemRes.rows.length > 0) {
      const { product_id, quantity } = itemRes.rows[0];
      await tx.query(
        `UPDATE inventory 
         SET available_quantity = available_quantity + $1, 
             reserved_quantity = reserved_quantity - $1, 
             updated_at = NOW() 
         WHERE product_id = $2;`,
        [quantity, product_id]
      );
      await tx.query(`DELETE FROM cart_items WHERE id = $1;`, [itemId]);
    }

    return { success: true, removed: true };
  });
}

/**
 * Clears all items from the cart and releases all reserved inventory.
 */
export async function clearCart(cartId) {
  return await withTransaction(async (tx) => {
    const itemsRes = await tx.query(`SELECT product_id, quantity FROM cart_items WHERE cart_id = $1;`, [cartId]);
    for (const item of itemsRes.rows) {
      await tx.query(
        `UPDATE inventory 
         SET available_quantity = available_quantity + $1, 
             reserved_quantity = reserved_quantity - $1, 
             updated_at = NOW() 
         WHERE product_id = $2;`,
        [item.quantity, item.product_id]
      );
    }
    await tx.query(`DELETE FROM cart_items WHERE cart_id = $1;`, [cartId]);
    return { success: true, cleared: true };
  });
}

/**
 * Merges an anonymous guest cart into the authenticated user cart on login.
 * Sums matching item quantities, clamps to min(99, availableStock),
 * releases any excess reservation, deletes the anonymous cart, and commits in a single transaction.
 */
export async function mergeCartsOnLogin({ userId, signedSessionToken }) {
  const rawSessionToken = verifyCartSession(signedSessionToken);
  if (!rawSessionToken) {
    return;
  }

  const db = await getDb();
  await db.exec('BEGIN;');

  try {
    const anonCartRes = await db.query(
      `SELECT id FROM carts WHERE session_token = $1;`,
      [rawSessionToken]
    );
    if (anonCartRes.rows.length === 0) {
      await db.exec('COMMIT;');
      return;
    }
    const anonCartId = anonCartRes.rows[0].id;

    let userCartRes = await db.query(
      `SELECT id FROM carts WHERE user_id = $1;`,
      [userId]
    );
    let userCartId;
    if (userCartRes.rows.length > 0) {
      userCartId = userCartRes.rows[0].id;
    } else {
      userCartId = `cart-usr-${userId}`;
      await db.query(`INSERT INTO carts (id, user_id) VALUES ($1, $2);`, [userCartId, userId]);
    }

    if (anonCartId === userCartId) {
      await db.exec('COMMIT;');
      return;
    }

    const anonItemsRes = await db.query(
      `SELECT product_id, quantity, selected_color FROM cart_items WHERE cart_id = $1;`,
      [anonCartId]
    );

    for (const item of anonItemsRes.rows) {
      const { product_id, quantity, selected_color } = item;
      const anonQty = parseInt(quantity, 10);

      // Check if user already has this product and color in their cart
      const userItemRes = await db.query(
        `SELECT id, quantity FROM cart_items 
         WHERE cart_id = $1 AND product_id = $2 AND (selected_color = $3 OR ($3 IS NULL AND selected_color IS NULL));`,
        [userCartId, product_id, selected_color]
      );

      if (userItemRes.rows.length > 0) {
        const existingQty = parseInt(userItemRes.rows[0].quantity, 10);
        const mergedQty = Math.min(CART_CONFIG.maxQuantityPerItem, existingQty + anonQty);
        const excess = (existingQty + anonQty) - mergedQty;
        if (excess > 0) {
          // Release excess reserved inventory back to available stock
          await db.query(
            `UPDATE inventory 
             SET available_quantity = available_quantity + $1, 
                 reserved_quantity = reserved_quantity - $1, 
                 updated_at = NOW() 
             WHERE product_id = $2;`,
            [excess, product_id]
          );
        }
        await db.query(
          `UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2;`,
          [mergedQty, userItemRes.rows[0].id]
        );
      } else {
        const newItemId = `ci-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        await db.query(
          `INSERT INTO cart_items (id, cart_id, product_id, quantity, selected_color)
           VALUES ($1, $2, $3, $4, $5);`,
          [newItemId, userCartId, product_id, anonQty, selected_color]
        );
      }
    }

    // Delete anonymous cart
    await db.query(`DELETE FROM carts WHERE id = $1;`, [anonCartId]);

    await db.exec('COMMIT;');
  } catch (err) {
    await db.exec('ROLLBACK;');
    throw err;
  }
}
