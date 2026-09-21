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
