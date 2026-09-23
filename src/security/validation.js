/**
 * Boundary Input Validation and Sanitization Module
 * Protects against Prototype Pollution, XSS, and Malformed Request Payloads.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Escapes HTML entities to neutralize Cross-Site Scripting (XSS).
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Defends against Prototype Pollution by blocking forbidden prototype keys.
 */
export function checkPrototypePollution(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 10) return;

  const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];
  for (const key of Object.getOwnPropertyNames(obj)) {
    if (forbiddenKeys.includes(key)) {
      const error = new Error(`Potential prototype pollution attempt detected via key: ${key}`);
      error.status = 400;
      error.code = 'ERR_PROTOTYPE_POLLUTION';
      throw error;
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      checkPrototypePollution(obj[key], depth + 1);
    }
  }
}

/**
 * Validates user registration payload.
 */
export function validateRegistrationInput(input) {
  checkPrototypePollution(input);
  if (!input || typeof input !== 'object') throw new Error('Invalid registration payload');

  const email = (input.email || '').trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new Error('Valid email address is required.');
  }

  const password = input.password || '';
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const fullName = (input.fullName || '').trim();
  if (!fullName || fullName.length < 2) {
    throw new Error('Full name must be at least 2 characters long.');
  }

  return {
    email,
    password,
    fullName: sanitizeString(fullName),
    phone: input.phone ? String(input.phone).trim() : null
  };
}

/**
 * Validates checkout confirmation payload.
 */
export function validateCheckoutInput(input) {
  checkPrototypePollution(input);
  if (!input || typeof input !== 'object') throw new Error('Invalid checkout payload');

  const addressId = (input.addressId || '').trim();
  if (!addressId) {
    throw new Error('Shipping address ID is required.');
  }

  const paymentMethod = (input.paymentMethod !== undefined && input.paymentMethod !== null && input.paymentMethod !== '')
    ? String(input.paymentMethod).trim()
    : 'WhatsApp Direct';
  const cleanMethod = paymentMethod.toLowerCase();
  const allowedStrategies = ['cod', 'cash on delivery', 'whatsapp', 'whatsapp direct'];
  if (!allowedStrategies.includes(cleanMethod)) {
    throw new Error(`Invalid payment method: ${paymentMethod}`);
  }

  return {
    addressId,
    paymentMethod,
    couponCode: input.couponCode ? sanitizeString(String(input.couponCode).trim().toUpperCase()) : null,
    idempotencyKey: input.idempotencyKey ? String(input.idempotencyKey).trim() : null
  };
}

/**
 * Validates product creation/update payload.
 */
export function validateProductInput(input) {
  checkPrototypePollution(input);
  if (!input || typeof input !== 'object') throw new Error('Invalid product payload');

  const name = (input.name || '').trim();
  if (!name || name.length < 2) {
    throw new Error('Product name must be at least 2 characters.');
  }

  const priceMinor = Number(input.priceMinor);
  if (!Number.isInteger(priceMinor) || priceMinor <= 0) {
    throw new Error('Price in minor units must be a positive integer.');
  }

  const slug = (input.slug || '').trim().toLowerCase();
  if (slug && !SLUG_REGEX.test(slug)) {
    throw new Error('Product slug may only contain lowercase letters, numbers, and hyphens.');
  }

  return {
    name: sanitizeString(name),
    priceMinor,
    slug: slug || null,
    categoryId: input.categoryId ? String(input.categoryId).trim() : null,
    description: input.description ? sanitizeString(String(input.description).trim()) : '',
    sku: input.sku ? String(input.sku).trim().toUpperCase() : null
  };
}
