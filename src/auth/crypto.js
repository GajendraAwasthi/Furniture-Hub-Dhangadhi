import argon2 from '@node-rs/argon2';
import crypto from 'crypto';

// Argon2id parameters strictly matching Phase 2 specification
const ARGON2_OPTIONS = {
  memoryCost: 19456, // m=19456 (~19MB)
  timeCost: 2,       // t=2 iterations
  parallelism: 1,    // p=1 thread
  algorithm: argon2.Algorithm.Argon2id
};

// Pre-computed dummy hash for timing-safe equalization during non-existent user login
let DUMMY_HASH = null;
export async function getDummyHash() {
  if (!DUMMY_HASH) {
    DUMMY_HASH = await argon2.hash('DummyPasswordForTimingSafety123!', ARGON2_OPTIONS);
  }
  return DUMMY_HASH;
}

/**
 * Hashes a plaintext password using Argon2id (m=19456, t=2, p=1)
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return await argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against an Argon2id hash.
 */
export async function verifyPassword(hash, password) {
  if (!hash || !password) return false;
  try {
    return await argon2.verify(hash, password);
  } catch (err) {
    return false;
  }
}

/**
 * Generates a cryptographically secure random token (hex string).
 */
export function generateToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Computes SHA-256 hash of a token for secure storage.
 * Raw tokens must NEVER be stored in databases or logs.
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time comparison between two hex strings (e.g. hashed tokens).
 * Prevents timing side-channel attacks.
 */
export function timingSafeCompare(knownHex, candidateHex) {
  if (!knownHex || !candidateHex) return false;
  const knownBuf = Buffer.from(knownHex, 'hex');
  const candidateBuf = Buffer.from(candidateHex, 'hex');

  if (knownBuf.length !== candidateBuf.length) {
    // Prevent length leakage while maintaining constant time work
    crypto.timingSafeEqual(knownBuf, knownBuf);
    return false;
  }

  return crypto.timingSafeEqual(knownBuf, candidateBuf);
}
