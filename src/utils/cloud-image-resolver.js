import { getClient, isSupabaseConfigured } from '../services/supabase.js';

/**
 * Resolves cloud storage links (Google Drive, Dropbox, OneDrive, etc.)
 * into direct, high-quality streaming image URLs that display natively in <img> tags.
 *
 * @param {string} url - Raw URL or image path
 * @returns {string} - Direct high-resolution image URL
 */
export function resolveCloudImageUrl(url) {
  if (!url || typeof url !== 'string') return '/images/hero-living-room.png';
  const clean = url.trim();

  // Data URLs and local paths require no cloud transformation
  if (clean.startsWith('data:image/') || clean.startsWith('blob:') || clean.startsWith('/')) {
    return clean;
  }

  // 1. Google Drive Links:
  // Patterns:
  // - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // - https://drive.google.com/open?id=FILE_ID
  // - https://drive.google.com/uc?id=FILE_ID
  // - https://docs.google.com/file/d/FILE_ID
  const gDriveMatch = clean.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=view&)?id=)([a-zA-Z0-9_-]+)/i)
    || clean.match(/docs\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);

  if (gDriveMatch && gDriveMatch[1]) {
    const fileId = gDriveMatch[1];
    // High-resolution thumbnail endpoint (sz=w1600 provides 1600px width without auth requirement)
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  }

  // 2. Dropbox Links:
  // Convert dl=0 to raw=1 for direct binary image streaming
  if (clean.includes('dropbox.com')) {
    let directUrl = clean.replace(/([?&])dl=0(&|$)/, '$1raw=1$2');
    if (!directUrl.includes('raw=1')) {
      directUrl += (directUrl.includes('?') ? '&' : '?') + 'raw=1';
    }
    return directUrl;
  }

  // 3. OneDrive Links:
  // Handle 1drv.ms links or OneDrive embed parameters
  if (clean.includes('1drv.ms') || clean.includes('onedrive.live.com')) {
    if (clean.includes('onedrive.live.com') && !clean.includes('download=1')) {
      return clean.replace('/view.aspx', '/download.aspx').concat(clean.includes('?') ? '&download=1' : '?download=1');
    }
    return clean;
  }

  // 4. Imgur Links:
  // Convert Imgur page links to direct i.imgur.com images if extension is missing
  if (clean.includes('imgur.com') && !clean.includes('i.imgur.com') && !clean.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
    const imgurId = clean.split('/').pop().split('.')[0];
    if (imgurId) {
      return `https://i.imgur.com/${imgurId}.jpg`;
    }
  }

  return clean;
}

/**
 * Parses single or bulk image URLs from pasted text.
 * Accepts newlines, commas, or semicolons as delimiters.
 *
 * @param {string} text - Raw input containing one or multiple URLs
 * @returns {Array<{ original: string, resolved: string, source: string }>}
 */
export function parseBulkImageUrls(text) {
  if (!text || typeof text !== 'string') return [];

  // Split by newlines, commas, or semicolons
  const rawTokens = text.split(/[\r\n,;]+/);
  const results = [];
  const seen = new Set();

  for (const token of rawTokens) {
    const cleaned = token.trim();
    if (!cleaned) continue;

    // Check basic URL format or local image path
    const isUrl = cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('/') || cleaned.startsWith('data:');
    if (!isUrl) continue;

    if (seen.has(cleaned)) continue;
    seen.add(cleaned);

    let source = 'Cloud URL';
    if (cleaned.includes('drive.google.com') || cleaned.includes('docs.google.com')) {
      source = 'Google Drive';
    } else if (cleaned.includes('dropbox.com')) {
      source = 'Dropbox';
    } else if (cleaned.includes('onedrive.live.com') || cleaned.includes('1drv.ms')) {
      source = 'OneDrive';
    } else if (cleaned.startsWith('data:')) {
      source = 'File Upload';
    }

    results.push({
      original: cleaned,
      resolved: resolveCloudImageUrl(cleaned),
      source
    });
  }

  return results;
}

/**
 * Compresses and reads an uploaded File object into a high-quality WebP/JPEG data URL.
 * Preserves high visual fidelity (1600px width ceiling, 0.88 quality) while keeping memory lean.
 *
 * @param {File} file - Browser File object
 * @param {number} maxDimension - Max width or height in pixels
 * @param {number} quality - Compression quality 0.1 to 1.0
 * @returns {Promise<string>}
 */
export function optimizeAndReadFile(file, maxDimension = 1600, quality = 0.88) {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof File || file instanceof Blob)) {
      return reject(new Error('Invalid file provided'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = new Image();
      img.onerror = () => resolve(dataUrl); // Fallback to raw dataUrl if canvas fails
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(dataUrl);

          // Render with smooth interpolation
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Output as modern WebP if supported, fallback to JPEG
          let optimized = '';
          try {
            optimized = canvas.toDataURL('image/webp', quality);
          } catch {
            optimized = canvas.toDataURL('image/jpeg', quality);
          }

          if (optimized && optimized.length > 50) {
            resolve(optimized);
          } else {
            resolve(dataUrl);
          }
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image to Supabase Storage bucket 'product-images' if available,
 * or gracefully returns the optimized high-resolution client URL.
 *
 * @param {File} file - File to upload
 * @param {string} productId - Product ID for folder organization
 * @returns {Promise<{ url: string, source: string }>}
 */
export async function uploadProductImage(file, productId = 'general') {
  const client = getClient();
  const isConfigured = isSupabaseConfigured();

  // 1. Try Supabase Storage upload if connected
  if (isConfigured && client?.storage) {
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `products/${productId}/${Date.now()}_${cleanName}`;
      
      const { data, error } = await client.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (!error && data) {
        const { data: publicData } = client.storage
          .from('product-images')
          .getPublicUrl(filePath);

        if (publicData?.publicUrl) {
          return { url: publicData.publicUrl, source: 'Supabase Cloud Storage' };
        }
      }
    } catch (err) {
      console.warn('Supabase storage upload bypassed, using high-resolution local optimizer:', err);
    }
  }

  // 2. Optimized client-side high-resolution compression fallback
  const dataUrl = await optimizeAndReadFile(file);
  return { url: dataUrl, source: 'Direct File Upload' };
}
