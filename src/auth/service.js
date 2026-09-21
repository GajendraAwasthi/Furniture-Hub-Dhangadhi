import { hashPassword, verifyPassword, generateToken, hashToken, timingSafeCompare, getDummyHash } from './crypto.js';
import { createSession, destroySession } from './session.js';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from './rate-limiter.js';
import { getRedis } from './redis.js';
import { getDb } from '../db/client.js';

export const GENERIC_AUTH_ERROR = 'Invalid email or password.';
export const GENERIC_RESET_MSG = 'If the provided email address is registered, a password reset link has been dispatched.';

/**
 * Registers a new customer user.
 * Password hashed with Argon2id (m=19456, t=2, p=1).
 */
export async function registerUser({ email, password, fullName, phone = null }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('A valid email address is required.');
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const db = await getDb();

  // Check if user exists (generic response pattern in public-facing controller)
  const existing = await db.query('SELECT id FROM users WHERE email = $1;', [cleanEmail]);
  if (existing.rows.length > 0) {
    // In production API, avoid enumeration by returning a generic response or standard error
    throw new Error('An account with this email address cannot be registered.');
  }

  const passwordHash = await hashPassword(password);
  const userId = `usr-${Date.now()}-${generateToken(4)}`;

  await db.query(
    `INSERT INTO users (id, email, password_hash, full_name, phone, is_verified) 
     VALUES ($1, $2, $3, $4, $5, false);`,
    [userId, cleanEmail, passwordHash, fullName || 'Customer', phone]
  );

  // Generate Email Verification Token
  const rawVerificationToken = generateToken(32);
  const tokenHash = hashToken(rawVerificationToken);
  const redis = getRedis();

  // Store verification token in Redis (valid for 24 hours = 86400 seconds)
  await redis.set(`email_verify:${tokenHash}`, JSON.stringify({ userId, email: cleanEmail }), 'EX', 86400);

  return {
    userId,
    email: cleanEmail,
    fullName,
    isVerified: false,
    verificationToken: rawVerificationToken // returned for transmission via email
  };
}

/**
 * Authenticates user with email and password.
 * Enforces rate limiting, timing-safe execution, generic error messages, and session rotation.
 */
export async function loginUser({ email, password, ip = '127.0.0.1', currentSessionId = null }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanIp = (ip || '127.0.0.1').trim();

  // 1. Enforce Rate Limiting (5 attempts / 15 min / IP + account)
  const rateLimit = await checkRateLimit(cleanIp, cleanEmail);
  if (rateLimit.isLocked) {
    const minutes = Math.ceil(rateLimit.retryAfterSeconds / 60);
    throw new Error(`Too many login attempts. Access temporarily locked for ${minutes} minute(s).`);
  }

  const db = await getDb();
  const userRes = await db.query(
    `SELECT id, email, password_hash, full_name, is_verified 
     FROM users 
     WHERE email = $1;`,
    [cleanEmail]
  );

  const user = userRes.rows[0];

  // 2. Timing-safe execution: If user does not exist, run dummy Argon2 verify to prevent enumeration
  if (!user) {
    const dummyHash = await getDummyHash();
    await verifyPassword(dummyHash, password);
    await recordFailedAttempt(cleanIp, cleanEmail);
    throw new Error(GENERIC_AUTH_ERROR);
  }

  // 3. Verify password with Argon2id
  const isMatch = await verifyPassword(user.password_hash, password);
  if (!isMatch) {
    await recordFailedAttempt(cleanIp, cleanEmail);
    throw new Error(GENERIC_AUTH_ERROR);
  }

  // 4. Success: Clear rate limit
  await clearRateLimit(cleanIp, cleanEmail);

  // 5. Session Rotation: Invalidate pre-existing session ID (if any) and issue a brand new session
  const { sessionId, session, cookieOptions } = await createSession(
    user.id,
    { email: user.email, fullName: user.full_name, role: 'CUSTOMER' },
    currentSessionId
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      isVerified: user.is_verified
    },
    sessionId,
    cookieOptions
  };
}

/**
 * Initiates single-use, time-limited password reset.
 * Always returns generic success message to prevent user enumeration.
 */
export async function requestPasswordReset(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const db = await getDb();

  const userRes = await db.query('SELECT id, email FROM users WHERE email = $1;', [cleanEmail]);
  const user = userRes.rows[0];

  let rawToken = null;

  if (user) {
    rawToken = generateToken(32);
    const tokenHash = hashToken(rawToken);
    const redis = getRedis();

    // 15-minute expiry (900 seconds), single-use flag
    const payload = {
      userId: user.id,
      email: user.email,
      used: false,
      tokenHash
    };

    await redis.set(`pwd_reset:${tokenHash}`, JSON.stringify(payload), 'EX', 900);
  }

  return {
    message: GENERIC_RESET_MSG,
    resetToken: rawToken // in production, sent via email; returned here for dispatch
  };
}

/**
 * Resets user password using a single-use token.
 * Token is verified in constant time and immediately invalidated.
 */
export async function resetPasswordWithToken({ token, newPassword }) {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid or expired password reset token.');
  }
  if (!newPassword || newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters long.');
  }

  const candidateHash = hashToken(token);
  const redis = getRedis();
  const key = `pwd_reset:${candidateHash}`;

  const raw = await redis.get(key);
  if (!raw) {
    throw new Error('Invalid or expired password reset token.');
  }

  const data = JSON.parse(raw);

  // Single-use token enforcement
  if (data.used) {
    await redis.del(key);
    throw new Error('This password reset token has already been used.');
  }

  // Constant-time token hash verification
  const isMatch = timingSafeCompare(data.tokenHash, candidateHash);
  if (!isMatch) {
    throw new Error('Invalid or expired password reset token.');
  }

  // Immediately invalidate token (prevent replay attacks)
  await redis.del(key);

  // Hash new password and update database
  const newHash = await hashPassword(newPassword);
  const db = await getDb();

  await db.query(
    `UPDATE users 
     SET password_hash = $1, updated_at = NOW() 
     WHERE id = $2;`,
    [newHash, data.userId]
  );

  return {
    success: true,
    message: 'Password successfully updated. Please log in with your new password.'
  };
}

/**
 * Verifies email with a single-use token.
 */
export async function verifyEmailWithToken(token) {
  if (!token) throw new Error('Invalid verification token.');

  const candidateHash = hashToken(token);
  const redis = getRedis();
  const key = `email_verify:${candidateHash}`;

  const raw = await redis.get(key);
  if (!raw) {
    throw new Error('Invalid or expired verification token.');
  }

  const data = JSON.parse(raw);
  await redis.del(key); // Invalidate token immediately

  const db = await getDb();
  await db.query('UPDATE users SET is_verified = true, updated_at = NOW() WHERE id = $1;', [data.userId]);

  return {
    success: true,
    message: 'Email successfully verified.'
  };
}
