/**
 * Image Optimization Helper
 * Generates modern WebP responsive srcsets, lazy-loading tokens, and ensures design preservation.
 */

export const CDN_BASE_URL = process.env.CDN_BASE_URL || 'https://cdn.furniturehub.com';

/**
 * Builds responsive WebP srcset attribute values.
 */
export function buildResponsiveSrcSet(imageUrl, widths = [400, 800, 1200]) {
  if (!imageUrl || typeof imageUrl !== 'string') return '';

  // Local assets or relative paths
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    return widths.map(w => `${imageUrl}?w=${w}&format=webp ${w}w`).join(', ');
  }

  // CDN URLs
  return widths.map(w => {
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}w=${w}&format=webp ${w}w`;
  }).join(', ');
}

/**
 * Returns complete image element attribute object ready for HTML rendering
 * without changing existing CSS styles or classes.
 */
export function getOptimizedImageProps({
  src,
  alt = 'Furniture Hub Dhangadhi Product',
  className = '',
  widths = [400, 800, 1200],
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  isPriority = false
}) {
  const srcset = buildResponsiveSrcSet(src, widths);

  return {
    src,
    srcset,
    sizes,
    alt,
    className,
    loading: isPriority ? 'eager' : 'lazy',
    decoding: 'async'
  };
}
