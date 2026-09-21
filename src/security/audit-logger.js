import { getDb } from '../db/client.js';
import crypto from 'crypto';

/**
 * Append-Only Security Audit Logger
 * Records administrative and high-risk security actions into the audit_logs table.
 */

export const AUDIT_ACTIONS = {
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  ADMIN_LOGIN_FAILED: 'ADMIN_LOGIN_FAILED',
  PRODUCT_CREATED: 'PRODUCT_CREATED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  IDOR_ATTEMPT_DETECTED: 'IDOR_ATTEMPT_DETECTED',
  PRICE_TAMPER_ATTEMPT_DETECTED: 'PRICE_TAMPER_ATTEMPT_DETECTED'
};

/**
 * Appends a new audit log entry.
 */
export async function logAuditEvent({
  adminId = null,
  action,
  entityType,
  entityId,
  metadata = {},
  ipAddress = '127.0.0.1'
}) {
  if (!action || !entityType || !entityId) {
    throw new Error('Audit log requires action, entityType, and entityId.');
  }

  const db = await getDb();
  const id = `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  const res = await db.query(
    `INSERT INTO audit_logs (id, admin_id, action, entity_type, entity_id, metadata, ip_address, created_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW())
     RETURNING id, action, entity_type, entity_id, created_at;`,
    [
      id,
      adminId,
      action,
      entityType,
      entityId,
      JSON.stringify(metadata),
      ipAddress
    ]
  );

  return res.rows[0];
}

/**
 * Retrieves audit logs (Read-Only query).
 */
export async function getAuditLogs({ limit = 50, entityType = null, action = null } = {}) {
  const db = await getDb();
  const conditions = [];
  const params = [];

  if (entityType) {
    params.push(entityType);
    conditions.push(`entity_type = $${params.length}`);
  }

  if (action) {
    params.push(action);
    conditions.push(`action = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(Math.min(limit, 100));

  const query = `
    SELECT id, admin_id, action, entity_type, entity_id, metadata, ip_address, created_at
    FROM audit_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length};
  `;

  const res = await db.query(query, params);
  return res.rows;
}

/**
 * Defends immutability: Rejects any attempt to modify or delete audit records.
 */
export async function rejectAuditModification(recordId) {
  throw new Error('AUDIT_IMMUTABILITY_VIOLATION: Audit log records are strictly append-only and cannot be updated or deleted.');
}
