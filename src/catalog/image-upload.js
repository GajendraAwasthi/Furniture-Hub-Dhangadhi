import crypto from 'crypto';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export const UPLOAD_CONFIG = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB maximum file size
  cdnBaseUrl: process.env.CDN_BASE_URL || 'https://cdn.furniturehub.com/products',
  allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
};

/**
 * Validates real image MIME type strictly by MAGIC BYTES (file signatures),
 * never trusting the client-supplied filename or Content-Type header.
 * 
 * Rejects disguised executable scripts (e.g. PHP shells named 'photo.jpg').
 */
export function detectMimeByMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // 1. JPEG signature: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // 2. PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return 'image/png';
  }

  // 3. WebP signature: RIFF .... WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  // 4. AVIF signature: ....ftypavif or ftypavis
  const brand = buffer.toString('ascii', 4, 12);
  if (brand.includes('ftypavif') || brand.includes('ftypavis')) {
    return 'image/avif';
  }

  // Check for malicious embedded scripts (PHP, HTML, Bash)
  const headerText = buffer.slice(0, 100).toString('utf-8').toLowerCase();
  if (
    headerText.includes('<?php') ||
    headerText.includes('<?=') ||
    headerText.includes('<script') ||
    headerText.includes('#!/bin')
  ) {
    return 'application/x-executable-malicious';
  }

  return null;
}

/**
 * Processes and sanitizes uploaded product image:
 * 1. Checks size limit.
 * 2. Validates magic bytes (rejects fake extensions).
 * 3. Strips EXIF metadata (GPS, device serials).
 * 4. Re-encodes to optimized WebP.
 * 5. Generates random UUID key.
 * 6. Generates CDN URL.
 */
export async function processImageUpload(fileBuffer, originalFilename = 'image.jpg') {
  // 1. Cap file size
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('Upload rejected: Empty file received.');
  }
  if (fileBuffer.length > UPLOAD_CONFIG.maxSizeBytes) {
    const sizeMb = (fileBuffer.length / (1024 * 1024)).toFixed(2);
    throw new Error(`Upload rejected: File size (${sizeMb}MB) exceeds 5MB limit.`);
  }

  // 2. Validate real MIME by magic bytes
  const realMime = detectMimeByMagicBytes(fileBuffer);
  if (!realMime || !UPLOAD_CONFIG.allowedMimes.includes(realMime)) {
    throw new Error(`Upload rejected: Security validation failed. File "${originalFilename}" does not contain valid image magic bytes.`);
  }

  // 3 & 4. Strip EXIF metadata and re-encode to clean WebP
  let sanitizedBuffer;
  let metadata;
  try {
    const imagePipeline = sharp(fileBuffer, { failOnError: true })
      .rotate() // auto-orient based on orientation tag before stripping
      .withMetadata(false) // strip all EXIF, IPTC, XMP metadata
      .webp({ quality: 85, effort: 4 });

    sanitizedBuffer = await imagePipeline.toBuffer();
    metadata = await sharp(sanitizedBuffer).metadata();
  } catch (err) {
    throw new Error(`Upload rejected: Corrupted or malicious image payload. ${err.message}`);
  }

  // 5. Generate random, unguessable storage key
  const randomKey = `prod-img-${crypto.randomUUID()}.webp`;

  // 6. Return CDN asset descriptor
  const cdnUrl = `${UPLOAD_CONFIG.cdnBaseUrl}/${randomKey}`;

  return {
    storageKey: randomKey,
    cdnUrl,
    format: 'webp',
    width: metadata.width,
    height: metadata.height,
    originalSizeBytes: fileBuffer.length,
    sanitizedSizeBytes: sanitizedBuffer.length,
    buffer: sanitizedBuffer
  };
}
