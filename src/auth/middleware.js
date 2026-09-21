import { getSession, SESSION_CONFIG } from './session.js';

/**
 * Extracts session ID from request cookies or authorization headers.
 */
export function extractSessionId(req) {
  if (!req) return null;

  // 1. From Cookie header
  if (req.headers && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const c of cookies) {
      const [name, val] = c.trim().split('=');
      if (name === SESSION_CONFIG.cookieName) {
        return decodeURIComponent(val);
      }
    }
  }

  // 2. From req.cookies object (Express/Next.js)
  if (req.cookies && req.cookies[SESSION_CONFIG.cookieName]) {
    return req.cookies[SESSION_CONFIG.cookieName];
  }

  return null;
}

/**
 * Optional Auth Middleware:
 * Attaches user session if valid, but NEVER blocks guests.
 * Allows anonymous browsing across Home, Catalog, and Product Detail.
 */
export async function optionalAuth(req) {
  if (req.user && req.user.id) {
    return;
  }
  const sessionId = extractSessionId(req);
  if (!sessionId) {
    req.user = null;
    req.session = null;
    return;
  }

  const session = await getSession(sessionId);
  if (session) {
    req.user = { id: session.userId, ...session.data };
    req.session = session;
  } else {
    req.user = null;
    req.session = null;
  }
}

/**
 * Required Auth Middleware:
 * Enforced ONLY at checkout. Blocks unauthenticated users with 401.
 */
export async function requireAuth(req) {
  await optionalAuth(req);
  if (!req.user) {
    const error = new Error('Authentication required. Please sign in to proceed with checkout.');
    error.status = 401;
    error.code = 'UNAUTHORIZED';
    throw error;
  }
}

/**
 * Validates route access policy against domain flow constraints:
 * - Home, Catalog, and Product Detail are ALWAYS public (no login wall).
 * - Checkout REQUIRES authentication.
 */
export function isRoutePublic(path) {
  const normalized = (path || '/').toLowerCase().split('?')[0].replace('#', '/');
  
  if (normalized === '/' || normalized === '/home' || normalized === '') return true;
  if (normalized.startsWith('/shop') || normalized.startsWith('/catalog')) return true;
  if (normalized.startsWith('/product') || normalized.startsWith('/product-detail')) return true;
  if (normalized.startsWith('/cart')) return true;

  // Protected customer routes
  if (normalized.startsWith('/checkout') || normalized.startsWith('/account')) {
    return false;
  }

  return true;
}
