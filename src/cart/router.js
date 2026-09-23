import { optionalAuth } from '../auth/middleware.js';
import { requireCsrf } from '../security/csrf.js';
import { 
  getOrCreateCart, 
  getCartDetails, 
  addItemToCart, 
  updateCartItemQuantity, 
  removeCartItem, 
  clearCart, 
  mergeCartsOnLogin,
  CART_CONFIG 
} from './service.js';

export async function handleCartRequest(req) {
  const method = (req.method || 'GET').toUpperCase();
  const url = req.url || '/';
  const [path, queryString] = url.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryString || ''));

  // Attach session context if customer is logged in
  await optionalAuth(req);

  // CSRF validation for non-safe state-changing methods
  requireCsrf(req);

  // Extract signed cart session cookie
  let signedCartToken = null;
  if (req.headers && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const c of cookies) {
      const [name, val] = c.trim().split('=');
      if (name === CART_CONFIG.cookieName) {
        signedCartToken = decodeURIComponent(val);
        break;
      }
    }
  }

  // Resolve cart (authenticated by userId if logged in; otherwise by signed anonymous cookie)
  const { cart, signedCookie } = await getOrCreateCart({
    userId: req.user ? req.user.id : null,
    signedSessionToken: signedCartToken
  });

  const responseHeaders = {};
  if (signedCookie) {
    responseHeaders['Set-Cookie'] = `${CART_CONFIG.cookieName}=${encodeURIComponent(signedCookie)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${CART_CONFIG.cookieOptions.maxAge}`;
  }

  // 1. GET /api/cart — Retrieve full cart details
  if (method === 'GET' && path === '/api/cart') {
    const cartDetails = await getCartDetails(cart.id, query.coupon || null);
    return { status: 200, headers: responseHeaders, body: cartDetails };
  }

  // 2. POST /api/cart/items — Add item to cart
  if (method === 'POST' && path === '/api/cart/items') {
    const { productId, quantity, color } = req.body || {};
    if (!productId) {
      return { status: 400, headers: responseHeaders, body: { error: 'productId is required' } };
    }

    try {
      const result = await addItemToCart(cart.id, { productId, quantity, color });
      const updatedCart = await getCartDetails(cart.id, query.coupon || null);
      return { status: 200, headers: responseHeaders, body: { ...result, cart: updatedCart } };
    } catch (err) {
      return { status: 400, headers: responseHeaders, body: { error: err.message } };
    }
  }

  // 3. PUT /api/cart/items/:id — Update item quantity
  if (method === 'PUT' && path.startsWith('/api/cart/items/')) {
    const itemId = path.replace('/api/cart/items/', '');
    const { quantity } = req.body || {};

    try {
      const result = await updateCartItemQuantity(cart.id, itemId, quantity);
      const updatedCart = await getCartDetails(cart.id, query.coupon || null);
      return { status: 200, headers: responseHeaders, body: { ...result, cart: updatedCart } };
    } catch (err) {
      return { status: 400, headers: responseHeaders, body: { error: err.message } };
    }
  }

  // 4. DELETE /api/cart/items/:id — Remove item from cart
  if (method === 'DELETE' && path.startsWith('/api/cart/items/')) {
    const itemId = path.replace('/api/cart/items/', '');
    await removeCartItem(cart.id, itemId);
    const updatedCart = await getCartDetails(cart.id, query.coupon || null);
    return { status: 200, headers: responseHeaders, body: { success: true, cart: updatedCart } };
  }

  // 5. DELETE /api/cart — Clear entire cart
  if (method === 'DELETE' && path === '/api/cart') {
    await clearCart(cart.id);
    const updatedCart = await getCartDetails(cart.id);
    return { status: 200, headers: responseHeaders, body: { success: true, cart: updatedCart } };
  }

  // 6. POST /api/cart/merge — Merge anonymous cart into user cart on login
  if (method === 'POST' && path === '/api/cart/merge') {
    if (!req.user) {
      return { status: 401, headers: responseHeaders, body: { error: 'Must be logged in to merge cart' } };
    }
    const { anonymousCartToken } = req.body || {};
    await mergeCartsOnLogin({
      userId: req.user.id,
      signedSessionToken: anonymousCartToken || signedCartToken
    });
    const updatedCart = await getCartDetails(cart.id);
    return { status: 200, headers: responseHeaders, body: { success: true, cart: updatedCart } };
  }

  return { status: 404, headers: responseHeaders, body: { error: 'Endpoint not found' } };
}
