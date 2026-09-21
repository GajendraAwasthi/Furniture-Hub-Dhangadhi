import { getRedis } from './redis.js';
import { generateToken } from './crypto.js';

// Session expiry policies (in seconds)
export const SESSION_CONFIG = {
  cookieName: 'fh_session',
  idleExpirySeconds: 1800,      // 30 minutes idle timeout
  absoluteExpirySeconds: 604800, // 7 days absolute maximum lifetime
  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/'
  }
};

/**
 * Creates a server-side session in Redis.
 * If `oldSessionId` is passed, it is destroyed first (SESSION ROTATION to prevent fixation).
 */
export async function createSession(userId, data = {}, oldSessionId = null) {
  const redis = getRedis();

  if (oldSessionId) {
    await destroySession(oldSessionId);
  }

  const newSessionId = generateToken(32); // 256-bit cryptographically secure session ID
  const now = Date.now();
  const absoluteExpiryAt = now + (SESSION_CONFIG.absoluteExpirySeconds * 1000);

  const sessionPayload = {
    sessionId: newSessionId,
    userId,
    data,
    createdAt: now,
    lastActiveAt: now,
    absoluteExpiryAt
  };

  const key = `sess:${newSessionId}`;
  // Set Redis TTL to the idle expiry initially
  await redis.set(key, JSON.stringify(sessionPayload), 'EX', SESSION_CONFIG.idleExpirySeconds);

  return {
    sessionId: newSessionId,
    session: sessionPayload,
    cookieOptions: {
      ...SESSION_CONFIG.cookieOptions,
      maxAge: SESSION_CONFIG.absoluteExpirySeconds
    }
  };
}

/**
 * Retrieves and validates an existing session from Redis.
 * Checks both idle expiry and absolute expiry.
 * Touches session to refresh idle expiry if valid.
 */
export async function getSession(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') return null;

  const redis = getRedis();
  const key = `sess:${sessionId}`;
  const raw = await redis.get(key);
  if (!raw) return null;

  let session;
  try {
    session = JSON.parse(raw);
  } catch (e) {
    await redis.del(key);
    return null;
  }

  const now = Date.now();

  // 1. Enforce Absolute Expiry
  if (now > session.absoluteExpiryAt) {
    await redis.del(key);
    return null;
  }

  // 2. Refresh Idle Expiry (calculate remaining absolute TTL to prevent exceeding absolute lifetime)
  const remainingAbsoluteSeconds = Math.max(0, Math.floor((session.absoluteExpiryAt - now) / 1000));
  const newTtl = Math.min(SESSION_CONFIG.idleExpirySeconds, remainingAbsoluteSeconds);

  if (newTtl <= 0) {
    await redis.del(key);
    return null;
  }

  session.lastActiveAt = now;
  await redis.set(key, JSON.stringify(session), 'EX', newTtl);

  return session;
}

/**
 * Destroys a session in Redis (e.g. on logout or rotation).
 */
export async function destroySession(sessionId) {
  if (!sessionId) return;
  const redis = getRedis();
  await redis.del(`sess:${sessionId}`);
}
