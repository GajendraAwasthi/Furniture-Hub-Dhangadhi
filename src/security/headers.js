import crypto from 'crypto';

/**
 * Generates cryptographically secure CSP nonce.
 */
export function generateCspNonce() {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Constructs production-grade Content-Security-Policy header.
 */
export function buildContentSecurityPolicy(nonce) {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://cdn.furniturehub.com https://images.unsplash.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ];
  return directives.join('; ');
}

/**
 * Generates full suite of modern OWASP-recommended HTTP security headers.
 */
export function getSecurityHeaders(options = {}) {
  const nonce = options.nonce || generateCspNonce();

  return {
    // 1. Strict Transport Security (HSTS) - 2 years + subdomains + preload
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

    // 2. Content Security Policy
    'Content-Security-Policy': buildContentSecurityPolicy(nonce),

    // 3. Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // 4. Prevent Clickjacking (framing)
    'X-Frame-Options': 'DENY',

    // 5. Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // 6. Restrict browser feature access
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',

    // 7. Isolation headers
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',

    // Export nonce for HTML script tag rendering
    'X-CSP-Nonce': nonce
  };
}

/**
 * Middleware helper to apply security headers to standard HTTP responses.
 */
export function applySecurityHeaders(req, res) {
  const nonce = generateCspNonce();
  const headers = getSecurityHeaders({ nonce });

  if (res && typeof res.setHeader === 'function') {
    for (const [key, value] of Object.entries(headers)) {
      if (key !== 'X-CSP-Nonce') {
        res.setHeader(key, value);
      }
    }
  }

  // Attach nonce to request for HTML templating
  if (req) {
    req.cspNonce = nonce;
  }

  return headers;
}
