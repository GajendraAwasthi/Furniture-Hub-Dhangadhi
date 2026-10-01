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

/**
 * Validates category creation/update payload.
 * Defends against prototype pollution, XSS injection, invalid slug characters, and duplicate names/slugs.
 */
export function validateCategoryInput(input, existingCategories = []) {
  checkPrototypePollution(input);
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid category payload');
  }

  const name = (input.name || '').trim();
  if (!name || name.length < 2 || name.length > 50) {
    throw new Error('Category name must be between 2 and 50 characters.');
  }

  // Derive or validate slug
  let slug = (input.slug || '').trim().toLowerCase();
  if (!slug) {
    slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  if (!slug || !SLUG_REGEX.test(slug)) {
    throw new Error('Category slug may only contain lowercase alphanumeric characters and hyphens.');
  }

  // Check uniqueness against existing categories (excluding current category if updating)
  const currentId = input.id ? String(input.id).trim() : null;
  const existing = Array.isArray(existingCategories) ? existingCategories : [];
  const isDuplicate = existing.some(c => {
    if (currentId && String(c.id) === currentId) return false;
    const sameSlug = (c.slug && c.slug.toLowerCase() === slug);
    const sameName = (c.name && c.name.toLowerCase() === name.toLowerCase());
    return sameSlug || sameName;
  });

  if (isDuplicate) {
    throw new Error(`A category with name "${name}" or slug "${slug}" already exists.`);
  }

  const rawIcon = typeof input.icon === 'string' ? input.icon.trim().slice(0, 10) : '🏷️';
  const icon = sanitizeString(rawIcon) || '🏷️';
  const description = input.description ? sanitizeString(String(input.description).trim().slice(0, 300)) : '';

  return {
    id: currentId || slug,
    name: sanitizeString(name),
    slug,
    icon,
    description,
    createdAt: input.createdAt || new Date().toISOString()
  };
}
