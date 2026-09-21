import { getRedis } from './redis.js';

export const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,
  windowSeconds: 900, // 15 minutes
  baseLockoutSeconds: 900 // 15 minutes base lockout
};

/**
 * Normalizes an IP and email into a composite rate-limit key.
 */
function buildKey(ip, email) {
  const cleanIp = (ip || '127.0.0.1').trim().toLowerCase();
  const cleanEmail = (email || 'unknown').trim().toLowerCase();
  return `ratelimit:login:${cleanIp}:${cleanEmail}`;
}

/**
 * Checks if the IP+account is currently rate-limited.
 * Returns: { isLocked: boolean, remainingAttempts: number, retryAfterSeconds: number }
 */
export async function checkRateLimit(ip, email) {
  const redis = getRedis();
  const key = buildKey(ip, email);

  const raw = await redis.get(key);
  if (!raw) {
    return {
      isLocked: false,
      attempts: 0,
      remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts,
      retryAfterSeconds: 0
    };
  }

  const data = JSON.parse(raw);
  const ttl = await redis.ttl(key);

  if (data.attempts >= RATE_LIMIT_CONFIG.maxAttempts) {
    return {
      isLocked: true,
      attempts: data.attempts,
      remainingAttempts: 0,
      retryAfterSeconds: Math.max(1, ttl)
    };
  }

  return {
    isLocked: false,
    attempts: data.attempts,
    remainingAttempts: Math.max(0, RATE_LIMIT_CONFIG.maxAttempts - data.attempts),
    retryAfterSeconds: 0
  };
}

/**
 * Records a failed login attempt with exponential backoff on lockout.
 */
export async function recordFailedAttempt(ip, email) {
  const redis = getRedis();
  const key = buildKey(ip, email);

  const raw = await redis.get(key);
  let data = raw ? JSON.parse(raw) : { attempts: 0, lockouts: 0 };
  data.attempts += 1;

  let ttl = RATE_LIMIT_CONFIG.windowSeconds;

  // When threshold is hit or exceeded, apply lockout with exponential backoff
  if (data.attempts >= RATE_LIMIT_CONFIG.maxAttempts) {
    data.lockouts += 1;
    // Exponential backoff: 15min * 2^(lockouts - 1), capped at 24 hours
    const multiplier = Math.min(64, Math.pow(2, data.lockouts - 1));
    ttl = RATE_LIMIT_CONFIG.baseLockoutSeconds * multiplier;
  }

  await redis.set(key, JSON.stringify(data), 'EX', ttl);

  return {
    isLocked: data.attempts >= RATE_LIMIT_CONFIG.maxAttempts,
    attempts: data.attempts,
    remainingAttempts: Math.max(0, RATE_LIMIT_CONFIG.maxAttempts - data.attempts),
    retryAfterSeconds: ttl
  };
}

/**
 * Clears the rate limit upon successful authentication.
 */
export async function clearRateLimit(ip, email) {
  const redis = getRedis();
  const key = buildKey(ip, email);
  await redis.del(key);
}
