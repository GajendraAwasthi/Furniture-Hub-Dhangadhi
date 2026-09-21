import crypto from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || 'furniture-hub-csrf-default-secret-key-production-32b';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Generates a cryptographically secure CSRF token tied to a session ID or random salt.
 */
export function generateCsrfToken(sessionId) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hmac = crypto.createHmac('sha256', CSRF_SECRET);
  hmac.update(`${sessionId || 'anonymous'}:${salt}`);
  const signature = hmac.digest('hex');
  return `${salt}.${signature}`;
}

/**
 * Validates a CSRF token using constant-time comparison.
 */
export function verifyCsrfToken(token, sessionId) {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [salt, providedSignature] = parts;
  if (!salt || !providedSignature) return false;

  const hmac = crypto.createHmac('sha256', CSRF_SECRET);
  hmac.update(`${sessionId || 'anonymous'}:${salt}`);
  const expectedSignature = hmac.digest('hex');

  const providedBuf = Buffer.from(providedSignature, 'utf8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf8');

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * CSRF Protection Middleware
 * Verifies CSRF token for state-changing HTTP methods.
 */
export function requireCsrf(req) {
  const method = (req.method || 'GET').toUpperCase();

  // Safe idempotent methods are exempt
  if (SAFE_METHODS.has(method)) {
    return true;
  }

  // Extract CSRF token from headers
  const token = req.headers?.['x-csrf-token'] || 
                req.headers?.['X-CSRF-Token'] || 
                req.body?._csrf || 
                null;

  const sessionId = req.session?.id || req.user?.id || 'anonymous';

  if (!token || !verifyCsrfToken(token, sessionId)) {
    const error = new Error('Invalid or missing CSRF token.');
    error.status = 403;
    error.code = 'EBADCSRFTOKEN';
    throw error;
  }

  return true;
}
