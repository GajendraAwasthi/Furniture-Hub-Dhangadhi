import { optionalAuth } from '../auth/middleware.js';
import { createProduct, updateProduct, deleteProduct, listCatalogProducts, getProductBySlug, assertAdmin } from './service.js';
import { processImageUpload } from './image-upload.js';

/**
 * Dispatches catalog and admin upload API requests.
 */
export async function handleCatalogRequest(req) {
  const method = (req.method || 'GET').toUpperCase();
  const url = req.url || '/';
  const [path, queryString] = url.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryString || ''));

  // Attach session context if available (never blocks guests)
  await optionalAuth(req);

  // 1. PUBLIC: List Catalog Products with Keyset Pagination
  if (method === 'GET' && (path === '/api/catalog' || path === '/api/products')) {
    const data = await listCatalogProducts(query);
    return { status: 200, body: data };
  }

  // 2. PUBLIC: Get Single Product by Slug
  if (method === 'GET' && path.startsWith('/api/catalog/')) {
    const slug = path.replace('/api/catalog/', '');
    const product = await getProductBySlug(slug);
    if (!product) {
      return { status: 404, body: { error: 'Product not found' } };
    }
    return { status: 200, body: product };
  }

  // 3. ADMIN: Create Product
  if (method === 'POST' && path === '/api/admin/products') {
    assertAdmin(req.user);
    const created = await createProduct(req.user, req.body || {});
    return { status: 201, body: created };
  }

  // 4. ADMIN: Update Product
  if (method === 'PUT' && path.startsWith('/api/admin/products/')) {
    assertAdmin(req.user);
    const id = path.replace('/api/admin/products/', '');
    const updated = await updateProduct(req.user, id, req.body || {});
    return { status: 200, body: updated };
  }

  // 5. ADMIN: Delete Product
  if (method === 'DELETE' && path.startsWith('/api/admin/products/')) {
    assertAdmin(req.user);
    const id = path.replace('/api/admin/products/', '');
    const deleted = await deleteProduct(req.user, id);
    return { status: 200, body: deleted };
  }

  // 6. ADMIN: Image Upload Pipeline (Magic Byte Validation, EXIF Stripping, WebP Re-encoding)
  if (method === 'POST' && path === '/api/admin/upload') {
    assertAdmin(req.user);
    const fileBuffer = req.file?.buffer || req.body?.buffer;
    const filename = req.file?.name || req.body?.filename || 'upload.jpg';

    const result = await processImageUpload(fileBuffer, filename);
    return { status: 200, body: result };
  }

  return { status: 404, body: { error: 'Endpoint not found' } };
}
