import { getDb, withTransaction } from '../db/client.js';
import crypto from 'crypto';

/**
 * Validates address fields according to delivery rules in Nepal.
 */
export function validateAddressInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Address payload is required.');
  }

  const recipientName = (input.recipientName || '').trim();
  if (!recipientName || recipientName.length < 2) {
    throw new Error('Recipient name must be at least 2 characters long.');
  }

  const phone = (input.phone || '').trim().replace(/[\s-]/g, '');
  if (!phone || phone.length < 7) {
    throw new Error('A valid contact phone number is required.');
  }

  const addressLine1 = (input.addressLine1 || '').trim();
  if (!addressLine1 || addressLine1.length < 3) {
    throw new Error('Address line 1 (street address / ward / apartment) is required.');
  }

  const city = (input.city || '').trim();
  if (!city || city.length < 2) {
    throw new Error('City / Valley region is required.');
  }

  return {
    recipientName,
    phone,
    addressLine1,
    addressLine2: (input.addressLine2 || '').trim() || null,
    city,
    state: (input.state || 'Bagmati').trim(),
    postalCode: (input.postalCode || '').trim() || null,
    landmark: (input.landmark || '').trim() || null,
    isDefault: Boolean(input.isDefault)
  };
}

/**
 * Saves a new address to the user's address book.
 */
export async function createAddress(userId, addressData) {
  if (!userId) throw new Error('Authentication required to save delivery address.');
  const validated = validateAddressInput(addressData);
  const addressId = `addr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

  return await withTransaction(async (tx) => {
    // If setting as default, clear previous default address for this user
    if (validated.isDefault) {
      await tx.query(`UPDATE addresses SET is_default = false WHERE user_id = $1;`, [userId]);
    }

    // Check if this is user's first address; if so, make it default automatically
    const countRes = await tx.query(`SELECT COUNT(*) AS count FROM addresses WHERE user_id = $1;`, [userId]);
    const isFirst = parseInt(countRes.rows[0].count, 10) === 0;
    const finalDefault = validated.isDefault || isFirst;

    await tx.query(
      `INSERT INTO addresses (id, user_id, recipient_name, phone, address_line1, address_line2, city, state, postal_code, landmark, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
      [
        addressId,
        userId,
        validated.recipientName,
        validated.phone,
        validated.addressLine1,
        validated.addressLine2,
        validated.city,
        validated.state,
        validated.postalCode,
        validated.landmark,
        finalDefault
      ]
    );

    return { id: addressId, userId, ...validated, isDefault: finalDefault };
  });
}

/**
 * Retrieves all saved addresses for a user.
 */
export async function getUserAddresses(userId) {
  const db = await getDb();
  const res = await db.query(
    `SELECT id, recipient_name, phone, address_line1, address_line2, city, state, postal_code, landmark, is_default, created_at
     FROM addresses
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC;`,
    [userId]
  );

  return res.rows.map(r => ({
    id: r.id,
    recipientName: r.recipient_name,
    phone: r.phone,
    addressLine1: r.address_line1,
    addressLine2: r.address_line2,
    city: r.city,
    state: r.state,
    postalCode: r.postal_code,
    landmark: r.landmark,
    isDefault: r.is_default
  }));
}

/**
 * Sets an address as default for the user.
 */
export async function setDefaultAddress(userId, addressId) {
  return await withTransaction(async (tx) => {
    await tx.query(`UPDATE addresses SET is_default = false WHERE user_id = $1;`, [userId]);
    const res = await tx.query(
      `UPDATE addresses SET is_default = true, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id;`,
      [addressId, userId]
    );
    if (res.rows.length === 0) {
      throw new Error('Address not found or does not belong to this user.');
    }
    return { success: true, addressId };
  });
}
