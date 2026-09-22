/**
 * Security utilities for Furniture Hub Dhangadhi
 * Sanitization and input safety
 */

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function sanitizePhoneNumber(phone) {
  if (!phone) return '';
  return String(phone).replace(/[^0-9+]/g, '');
}

/**
 * Safe localStorage JSON parser with fallback and corruption auto-healing
 */
export function safeGetJson(key, fallback = null) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === '') return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (err) {
    console.warn(`[Storage] Corrupt JSON in key "${key}", purging and using fallback:`, err);
    try {
      localStorage.removeItem(key);
    } catch {}
    return fallback;
  }
}

/**
 * Safe localStorage JSON serializer with error handling
 */
export function safeSetJson(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[Storage] Failed to serialize key "${key}":`, err);
  }
}
