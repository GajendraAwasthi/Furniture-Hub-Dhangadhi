import { getDb } from '../db/client.js';
import { getRedis } from '../auth/redis.js';
import crypto from 'crypto';

/**
 * Validates that the active session has administrator authority.
 */
export function assertAdmin(user) {
  if (!user || !['ADMIN', 'SUPERADMIN'].includes(user.role)) {
    const err = new Error('Access denied: Administrator privileges required.');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
}

/**
 * Invalidates all catalog and product caches in Redis upon write operations.
 */
export async function invalidateCatalogCache() {
  const redis = getRedis();
  try {
    // Invalidate keys matching catalog list and product detail patterns
    if (typeof redis.keys === 'function') {
      const keys = await redis.keys('catalog:*');
      const prodKeys = await redis.keys('product:*');
      const allKeys = [...keys, ...prodKeys];
      if (allKeys.length > 0) {
        await redis.del(...allKeys);
      }
    }
  } catch (err) {
    console.warn('Cache invalidation warning:', err.message);
  }
}

// ==========================================================================
// 1. ADMIN PRODUCT CRUD
// ==========================================================================

export async function createProduct(adminUser, data) {
  assertAdmin(adminUser);

  if (!data.name || !data.categoryId || data.priceMinor === undefined) {
    throw new Error('Validation failed: name, categoryId, and priceMinor are required.');
  }

  const priceMinor = BigInt(data.priceMinor);
  if (priceMinor < 0n) throw new Error('priceMinor cannot be negative.');

  const compareAtPriceMinor = data.compareAtPriceMinor ? BigInt(data.compareAtPriceMinor) : null;
  const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
  const sku = data.sku || `SKU-FH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const productId = `prod-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

  const db = await getDb();
  await db.exec('BEGIN;');

  try {
    await db.query(
      `INSERT INTO products (id, slug, sku, name, category_id, description, price_minor, compare_at_price_minor, is_active, materials, dimensions, weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
      [
        productId,
        slug,
        sku,
        data.name,
        data.categoryId,
        data.description || '',
        priceMinor.toString(),
        compareAtPriceMinor ? compareAtPriceMinor.toString() : null,
        data.isActive !== undefined ? Boolean(data.isActive) : true,
        data.materials || null,
        data.dimensions || null,
        data.weight || null
      ]
    );

    // Create corresponding inventory record
    const initialStock = data.stockQuantity !== undefined ? parseInt(data.stockQuantity, 10) : 25;
    await db.query(
      `INSERT INTO inventory (id, product_id, available_quantity, reserved_quantity, low_stock_threshold)
       VALUES ($1, $2, $3, 0, $4);`,
      [`inv-${productId}`, productId, initialStock, data.lowStockThreshold || 3]
    );

    // If primary image provided, insert into product_images
    if (data.imageUrl) {
      await db.query(
        `INSERT INTO product_images (id, product_id, url, is_primary) VALUES ($1, $2, $3, true);`,
        [`img-${productId}`, productId, data.imageUrl]
      );
    }

    await db.exec('COMMIT;');
  } catch (err) {
    await db.exec('ROLLBACK;');
    throw err;
  }

  await invalidateCatalogCache();

  return {
    id: productId,
    slug,
    sku,
    name: data.name,
    priceMinor: Number(priceMinor)
  };
}

export async function updateProduct(adminUser, productId, data) {
  assertAdmin(adminUser);

  const db = await getDb();
  const fields = [];
  const params = [];
  let pIdx = 1;

  if (data.name) {
    fields.push(`name = $${pIdx++}`);
    params.push(data.name);
  }
  if (data.priceMinor !== undefined) {
    fields.push(`price_minor = $${pIdx++}`);
    params.push(BigInt(data.priceMinor).toString());
  }
  if (data.compareAtPriceMinor !== undefined) {
    fields.push(`compare_at_price_minor = $${pIdx++}`);
    params.push(data.compareAtPriceMinor ? BigInt(data.compareAtPriceMinor).toString() : null);
  }
  if (data.isActive !== undefined) {
    fields.push(`is_active = $${pIdx++}`);
    params.push(Boolean(data.isActive));
  }

  if (fields.length > 0) {
    fields.push(`updated_at = NOW()`);
    params.push(productId);
    await db.query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${pIdx};`,
      params
    );
  }

  // Update inventory if requested
  if (data.availableQuantity !== undefined) {
    await db.query(
      `UPDATE inventory SET available_quantity = $1, updated_at = NOW() WHERE product_id = $2;`,
      [parseInt(data.availableQuantity, 10), productId]
    );
  }

  await invalidateCatalogCache();

  return { success: true, productId };
}

export async function deleteProduct(adminUser, productId) {
  assertAdmin(adminUser);

  const db = await getDb();
  // Soft delete to preserve referential integrity with order_items
  await db.query(`UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1;`, [productId]);

  await invalidateCatalogCache();

  return { success: true, productId, deleted: true };
}

// ==========================================================================
// 2. PUBLIC CATALOG SERVICE (KEYSET PAGINATION + REDIS CACHE)
// ==========================================================================

/**
 * Keyset pagination catalog query. NEVER uses slow OFFSET scans on large tables!
 * Caches warm query results in Redis for sub-millisecond p95 latency.
 */
export async function listCatalogProducts(params = {}) {
  const limit = Math.min(50, Math.max(1, parseInt(params.limit || '20', 10)));
  const afterId = params.afterId || null;
  const categoryId = params.categoryId || null;
  const minPriceMinor = params.minPriceMinor ? BigInt(params.minPriceMinor).toString() : null;
  const maxPriceMinor = params.maxPriceMinor ? BigInt(params.maxPriceMinor).toString() : null;
  const inStockOnly = params.inStockOnly === true || params.inStockOnly === 'true';

  // Deterministic cache key
  const cacheKeyRaw = JSON.stringify({ limit, afterId, categoryId, minPriceMinor, maxPriceMinor, inStockOnly });
  const cacheKey = `catalog:list:${crypto.createHash('md5').update(cacheKeyRaw).digest('hex')}`;

  const FRESH_TTL_MS = 60 * 1000; // 60s fresh window
  const STALE_TTL_SEC = 3600;      // 1 hour maximum stale retention

  // 1. Try resilient Redis cache read (Graceful degradation if Redis unavailable)
  let cachedPayload = null;
  try {
    const redis = getRedis();
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Support SWR format or raw cached object
      if (parsed && parsed.__swr) {
        const isFresh = (Date.now() - parsed.cachedAt) < FRESH_TTL_MS;
        if (isFresh) {
          return parsed.data;
        }
        // Stale hit: return stale data immediately, trigger background refresh
        cachedPayload = parsed.data;
        // Asynchronous background revalidation
        Promise.resolve().then(async () => {
          try {
            const freshData = await executeCatalogQuery({
              categoryId, afterId, minPriceMinor, maxPriceMinor, inStockOnly, limit
            });
            await redis.set(cacheKey, JSON.stringify({
              __swr: true,
              cachedAt: Date.now(),
              data: freshData
            }), 'EX', STALE_TTL_SEC);
          } catch (bgErr) {
            // Background refresh failure handled silently
          }
        });
        return cachedPayload;
      } else {
        return parsed;
      }
    }
  } catch (cacheErr) {
    // Graceful degradation: Redis failure falls back directly to PostgreSQL
  }

  // 2. Direct database query
  const result = await executeCatalogQuery({
    categoryId, afterId, minPriceMinor, maxPriceMinor, inStockOnly, limit
  });

  // 3. Resilient cache write with SWR metadata
  try {
    const redis = getRedis();
    await redis.set(cacheKey, JSON.stringify({
      __swr: true,
      cachedAt: Date.now(),
      data: result
    }), 'EX', STALE_TTL_SEC);
  } catch (cacheErr) {
    // Cache write error ignored
  }

  return result;
}

export const listProducts = listCatalogProducts;

/**
 * Isolated catalog query executor for reuse in synchronous calls and SWR background revalidation.
 */
export async function executeCatalogQuery({ categoryId, afterId, minPriceMinor, maxPriceMinor, inStockOnly, limit }) {
  const db = await getDb();
  const whereClauses = ['p.is_active = true'];
  const queryParams = [];
  let paramIdx = 1;

  if (categoryId) {
    whereClauses.push(`p.category_id = $${paramIdx++}`);
    queryParams.push(categoryId);
  }

  // Keyset cursor condition (indexed)
  if (afterId) {
    whereClauses.push(`p.id > $${paramIdx++}`);
    queryParams.push(afterId);
  }

  if (minPriceMinor) {
    whereClauses.push(`p.price_minor >= $${paramIdx++}`);
    queryParams.push(minPriceMinor);
  }
  if (maxPriceMinor) {
    whereClauses.push(`p.price_minor <= $${paramIdx++}`);
    queryParams.push(maxPriceMinor);
  }
  if (inStockOnly) {
    whereClauses.push(`i.available_quantity > 0`);
  }

  const fetchLimit = limit + 1;
  queryParams.push(fetchLimit);
  const limitParamIdx = paramIdx++;

  const sql = `
    SELECT 
      p.id, 
      p.slug, 
      p.sku, 
      p.name, 
      p.category_id, 
      p.price_minor, 
      p.compare_at_price_minor,
      c.name AS category_name,
      c.slug AS category_slug,
      i.available_quantity,
      img.url AS primary_image_url
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventory i ON p.id = i.product_id
    LEFT JOIN product_images img ON p.id = img.product_id AND img.is_primary = true
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY p.id ASC
    LIMIT $${limitParamIdx};
  `;

  const res = await db.query(sql, queryParams);
  const rows = res.rows;
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

  return {
    items: items.map(r => ({
      id: r.id,
      slug: r.slug,
      sku: r.sku,
      name: r.name,
      categoryId: r.category_id,
      categoryName: r.category_name,
      categorySlug: r.category_slug,
      priceMinor: Number(r.price_minor),
      compareAtPriceMinor: r.compare_at_price_minor ? Number(r.compare_at_price_minor) : null,
      availableQuantity: r.available_quantity !== null ? Number(r.available_quantity) : 0,
      image: r.primary_image_url || '/images/hero-living-room.png'
    })),
    nextCursor,
    hasMore,
    count: items.length
  };
}

/**
 * Fetches a single product by slug with real-time stock and images.
 */
export async function getProductBySlug(slug) {
  const cleanSlug = (slug || '').trim();
  const cacheKey = `product:slug:${cleanSlug}`;
  const redis = getRedis();

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const db = await getDb();
  const res = await db.query(
    `SELECT 
       p.id, p.slug, p.sku, p.name, p.category_id, p.description, 
       p.price_minor, p.compare_at_price_minor, p.materials, p.dimensions, p.weight,
       c.name AS category_name,
       i.available_quantity
     FROM products p
     JOIN categories c ON p.category_id = c.id
     LEFT JOIN inventory i ON p.id = i.product_id
     WHERE p.slug = $1 AND p.is_active = true;`,
    [cleanSlug]
  );

  const product = res.rows[0];
  if (!product) return null;

  // Fetch product gallery images
  const imgRes = await db.query(
    `SELECT url, is_primary FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC;`,
    [product.id]
  );

  const result = {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    category: product.category_name,
    description: product.description,
    priceMinor: Number(product.price_minor),
    compareAtPriceMinor: product.compare_at_price_minor ? Number(product.compare_at_price_minor) : null,
    availableQuantity: product.available_quantity !== null ? Number(product.available_quantity) : 0,
    materials: product.materials,
    dimensions: product.dimensions,
    weight: product.weight,
    images: imgRes.rows.map(img => img.url)
  };

  await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
  return result;
}
