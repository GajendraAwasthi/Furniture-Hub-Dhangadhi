import { createClient } from '@supabase/supabase-js';
import initialProducts from '../data/products.json' with { type: 'json' };
import { validateCategoryInput } from '../security/validation.js';
import { isCurrentAdmin } from './customer-auth.js';

// Configuration keys
const STORAGE_DEMO_USER = 'fh_demo_admin_user';
const STORAGE_LOCAL_PRODUCTS = 'fh_store_products_v2';
const STORAGE_LOCAL_ORDERS = 'fh_local_orders';
const STORAGE_LOCAL_SETTINGS = 'fh_local_settings';
const STORAGE_LOCAL_COUPONS = 'fh_local_coupons';

// Retrieve credentials strictly from environment variables (.env)
export function getSupabaseConfig() {
  const url = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
  const anonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';
  return { url: url.trim(), anonKey: anonKey.trim() };
}

function isRealSupabaseUrl(url) {
  if (!url || !url.startsWith('https://')) return false;
  if (url.includes('your-project') || url.includes('xyzcompany') || url.includes('example.com')) return false;
  return true;
}

let supabaseInstance = null;

function initSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig();
  if (isRealSupabaseUrl(url) && anonKey && !anonKey.includes('your-anon')) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      return supabaseInstance;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      supabaseInstance = null;
    }
  }
  supabaseInstance = null;
  return null;
}

// Initial setup
initSupabaseClient();

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(isRealSupabaseUrl(url) && anonKey && supabaseInstance);
}

export function getClient() {
  if (!supabaseInstance) {
    initSupabaseClient();
  }
  return supabaseInstance;
}

export function setClientForTesting(client) {
  supabaseInstance = client;
}

// ==========================================================================
// AUTHENTICATION METHODS
// ==========================================================================

export async function loginWithEmail(email, password) {
  const client = getClient();
  if (client) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  } else {
    throw new Error('Supabase authentication service is currently unavailable. Please verify network or credentials.');
  }
}

export async function signUpWithEmail(email, password) {
  const client = getClient();
  const redirectUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_AUTH_REDIRECT_URL) || `${window.location.origin}/#admin`;

  if (client) {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    if (error) throw error;
    return data;
  } else {
    throw new Error('Supabase registration service is currently unavailable.');
  }
}

// Storage key for Supabase store admins table cache
const STORAGE_SUPABASE_ADMINS = 'fh_supabase_store_admins';

export function getLocalSupabaseAdmins() {
  try {
    const raw = localStorage.getItem(STORAGE_SUPABASE_ADMINS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }
  return [];
}

export function saveLocalSupabaseAdmins(admins) {
  if (Array.isArray(admins)) {
    localStorage.setItem(STORAGE_SUPABASE_ADMINS, JSON.stringify(admins));
  }
}

/**
 * Fetch and sync the latest store_admins directly from Supabase Cloud
 */
export async function syncSupabaseAdminsCache() {
  const client = getClient();
  if (client) {
    try {
      const { data, error } = await client.from('store_admins').select('*');
      if (!error && Array.isArray(data)) {
        saveLocalSupabaseAdmins(data);
        return data;
      }
    } catch (e) {
      console.warn('Failed to sync store_admins cache:', e);
    }
  }
  return getLocalSupabaseAdmins();
}

/**
 * Strict Supabase Admin Verification
 * Administrator role is validated directly from Supabase (app_metadata, user_metadata, or store_admins table).
 */
export async function checkIsSupabaseAdmin(user) {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const userId = user.id;

  const client = getClient();
  if (client) {
    try {
      // 1. Check server-side claims (app_metadata only, never client-modifiable user_metadata)
      const appRole = (user.app_metadata?.role || '').replace(/['"]/g, '').trim().toLowerCase();
      if (appRole === 'admin') {
        return true;
      }

      // 2. Query Supabase 'store_admins' table and sync cache
      const { data, error } = await client.from('store_admins').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        saveLocalSupabaseAdmins(data);

        const match = data.find(row => {
          const rowRole = (row.role || '').replace(/['"]/g, '').trim().toLowerCase();
          if (rowRole !== 'admin') return false;

          const rowEmail = (row.email || '').trim().toLowerCase();
          const rowId = (row.id || '').trim();
          const rowUserId = (row.user_id || '').trim();

          return (
            (email && rowEmail === email) ||
            (userId && (rowId === userId || rowUserId === userId))
          );
        });

        if (match) return true;
      }
    } catch (e) {
      console.warn('Supabase admin role verification warning:', e);
    }
  }

  // Authorization must fail closed - never trust browser-writable localStorage cache
  return false;
}

/**
 * Fetch all admins registered in Supabase
 */
export async function getSupabaseAdmins() {
  const client = getClient();
  if (client) {
    try {
      const { data, error } = await client.from('store_admins').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        saveLocalSupabaseAdmins(data);
        return data;
      }
    } catch (e) {
      console.warn('Failed to load store_admins from Supabase:', e);
    }
  }
  return getLocalSupabaseAdmins();
}

/**
 * Create Admin in Supabase - Only from Supabase can an admin be created
 */
export async function createSupabaseAdmin(email, fullName = 'Store Admin') {
  const cleanEmail = email.toLowerCase().trim();
  const client = getClient();
  const newAdmin = {
    id: `sb-admin-${Date.now()}`,
    email: cleanEmail,
    name: fullName,
    role: 'admin',
    created_at: new Date().toISOString()
  };

  if (client) {
    try {
      const { data, error } = await client.from('store_admins').insert([newAdmin]).select();
      if (!error && data && data[0]) return data[0];
    } catch (e) {
      console.warn('Supabase store_admins insert error:', e);
    }
  }

  const current = getLocalSupabaseAdmins();
  if (!current.some(a => a.email.toLowerCase() === cleanEmail)) {
    current.push(newAdmin);
    saveLocalSupabaseAdmins(current);
  }
  return newAdmin;
}

/**
 * Remove Admin from Supabase - Only from Supabase can an admin be removed
 */
export async function removeSupabaseAdmin(emailOrId) {
  const clean = emailOrId.toLowerCase().trim();
  const client = getClient();

  if (client) {
    try {
      await client.from('store_admins').delete().or(`email.eq.${clean},id.eq.${clean}`);
    } catch (e) {
      console.warn('Supabase store_admins delete error:', e);
    }
  }

  const current = getLocalSupabaseAdmins().filter(a => a.email.toLowerCase() !== clean && a.id !== clean);
  saveLocalSupabaseAdmins(current);
  return true;
}

export async function loginWithOAuth(provider = 'google') {
  const client = getClient();
  const redirectUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_AUTH_REDIRECT_URL) || window.location.origin;

  if (!client) {
    throw new Error('Error (Code: 503)');
  }

  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl
    }
  });
  if (error) {
    throw new Error(`Error (Code: ${error.status || 500})`);
  }
  return data;
}

export async function logout() {
  const client = getClient();
  localStorage.removeItem(STORAGE_DEMO_USER);
  if (client) {
    await client.auth.signOut();
  }
}

export async function getCurrentUser() {
  const client = getClient();
  if (client) {
    const { data: { user } } = await client.auth.getUser();
    if (user) return user;
  }
  const demo = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_DEMO_USER) : null;
  if (demo) {
    try {
      return JSON.parse(demo);
    } catch {
      return null;
    }
  }
  return null;
}

export async function resetPassword(email) {
  const client = getClient();
  if (client) {
    const { data, error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/#admin/reset-password'
    });
    if (error) throw error;
    return data;
  } else {
    return { message: 'Demo password reset link sent to ' + email };
  }
}

export async function testSupabaseConnection() {
  const client = getClient();
  if (!client) {
    return { success: false, message: 'Supabase credentials not configured or incomplete.' };
  }
  try {
    const { data, error } = await client.from('products').select('count', { count: 'exact', head: true });
    if (error) {
      if (error.code === '42P01') {
        return { 
          success: true, 
          connected: true, 
          schemaMissing: true, 
          message: 'Connected to Supabase! The "products" table has not been created yet. Run the SQL schema script in your Supabase SQL editor.' 
        };
      }
      return { success: false, message: error.message || 'Error communicating with Supabase database.' };
    }
    return { success: true, connected: true, message: 'Successfully connected to Supabase database!' };
  } catch (err) {
    return { success: false, message: err.message || 'Connection test failed.' };
  }
}

// ==========================================================================
// PRODUCTS DATABASE CRUD
// ==========================================================================

const LEGACY_CATEGORIES = ['seatings', 'combos', 'surfaces', 'decorations', 'greens', 'long sofa'];

function stripLegacyProductCategory(prod) {
  if (!prod) return prod;
  const cat = (prod.category || '').toLowerCase().trim();
  if (LEGACY_CATEGORIES.includes(cat)) {
    return { ...prod, category: '', tag: '' };
  }
  return prod;
}

function getLocalProducts() {
  try {
    localStorage.removeItem('fh_local_products'); // Clean any legacy demo products cache
    const stored = localStorage.getItem(STORAGE_LOCAL_PRODUCTS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed.map(stripLegacyProductCategory);
        // Sync cleaned state back to localStorage
        try {
          localStorage.setItem(STORAGE_LOCAL_PRODUCTS, JSON.stringify(cleaned));
        } catch { /* ignore */ }
        return cleaned;
      }
    }
  } catch { /* ignore */ }
  const fallback = Array.isArray(initialProducts) && initialProducts.length > 0 
    ? initialProducts.map(stripLegacyProductCategory) 
    : [];
  if (fallback.length > 0) {
    try {
      localStorage.setItem(STORAGE_LOCAL_PRODUCTS, JSON.stringify(fallback));
    } catch { /* ignore */ }
  }
  return fallback;
}

function saveLocalProducts(products) {
  localStorage.setItem(STORAGE_LOCAL_PRODUCTS, JSON.stringify(products));
}

export async function fetchProducts() {
  const client = getClient();
  if (client) {
    try {
      const { data, error } = await client.from('products').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data.map(normalizeProductFromDb);
      }
      if (error) {
        console.warn('Supabase product fetch failed, using local store:', error);
      }
    } catch (e) {
      console.warn('Supabase product fetch failed, using local store:', e);
    }
  }
  return getLocalProducts();
}

function normalizeProductFromDb(row) {
  const rawCat = (row.category || '').toLowerCase().trim();
  const cleanCategory = LEGACY_CATEGORIES.includes(rawCat) ? '' : (row.category || '');
  return {
    id: row.id,
    name: row.name,
    category: cleanCategory,
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    rating: Number(row.rating || 5),
    reviewCount: Number(row.review_count || 0),
    tag: LEGACY_CATEGORIES.includes((row.tag || '').toLowerCase().trim()) ? '' : (row.tag || cleanCategory),
    description: row.description || '',
    materials: row.materials || '',
    dimensions: row.dimensions || '',
    weight: row.weight || '',
    colors: Array.isArray(row.colors) ? row.colors : [],
    image: row.image,
    gallery: Array.isArray(row.gallery) ? row.gallery : [row.image],
    badge: row.badge || '',
    isNewArrival: Boolean(row.is_new_arrival),
    isBestSeller: Boolean(row.is_best_seller),
    isTopDeal: Boolean(row.is_top_deal),
    inStock: Boolean(row.in_stock)
  };
}

export async function saveProduct(product) {
  const client = getClient();
  const payload = {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    original_price: product.originalPrice || null,
    rating: product.rating || 5,
    review_count: product.reviewCount || 0,
    tag: product.tag || product.category,
    description: product.description || '',
    materials: product.materials || '',
    dimensions: product.dimensions || '',
    weight: product.weight || '',
    colors: product.colors || [],
    image: product.image,
    gallery: product.gallery || [product.image],
    badge: product.badge || null,
    is_new_arrival: Boolean(product.isNewArrival),
    is_best_seller: Boolean(product.isBestSeller),
    is_top_deal: Boolean(product.isTopDeal),
    in_stock: product.inStock !== false
  };
  if (product.stockQuantity !== undefined) {
    payload.stock_quantity = product.stockQuantity;
  }

  // Await and verify cloud mutation FIRST before mutating local state
  if (client) {
    const { data, error } = await client.from('products').upsert(payload).select();
    if (error) {
      console.error('Supabase product upsert error:', error);
      throw new Error(`Failed to save product in cloud database: ${error.message}`);
    }
    if (!data || data.length === 0) {
      throw new Error('Product could not be saved to cloud database.');
    }
  }

  // Update local cache strictly after cloud update succeeds (or if no client)
  const local = getLocalProducts();
  const idx = local.findIndex(p => p.id === product.id);
  if (idx >= 0) {
    local[idx] = { ...local[idx], ...product };
  } else {
    local.unshift(product);
  }
  saveLocalProducts(local);

  return product;
}

export async function deleteProduct(productId) {
  const client = getClient();
  // Await cloud delete FIRST before mutating local state
  if (client) {
    const { data, error } = await client.from('products').delete().eq('id', productId).select();
    if (error) {
      console.error('Supabase product delete error:', error);
      throw new Error(`Failed to delete product from cloud database: ${error.message}`);
    }
    if (!data || data.length === 0) {
      throw new Error(`Product "${productId}" was not found or could not be deleted.`);
    }
  }

  const local = getLocalProducts().filter(p => p.id !== productId);
  saveLocalProducts(local);
}

export async function syncLocalProductsToSupabase() {
  const client = getClient();
  if (!client) throw new Error('Supabase client not connected. Configure URL and Anon Key first.');

  const products = getLocalProducts();
  const rows = products.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    original_price: p.originalPrice || null,
    rating: p.rating || 5,
    review_count: p.reviewCount || 0,
    tag: p.tag || p.category,
    description: p.description || '',
    materials: p.materials || '',
    dimensions: p.dimensions || '',
    weight: p.weight || '',
    colors: p.colors || [],
    image: p.image,
    gallery: p.gallery || [p.image],
    badge: p.badge || null,
    is_new_arrival: Boolean(p.isNewArrival),
    is_best_seller: Boolean(p.isBestSeller),
    is_top_deal: Boolean(p.isTopDeal),
    in_stock: p.inStock !== false
  }));

  const { data, error } = await client.from('products').upsert(rows);
  if (error) throw error;
  return rows.length;
}

// ==========================================================================
// ORDERS DATABASE CRUD
// ==========================================================================

const DEFAULT_ORDERS = [];

function getLocalOrders() {
  const stored = localStorage.getItem(STORAGE_LOCAL_ORDERS);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* ignore */ }
  }
  localStorage.setItem(STORAGE_LOCAL_ORDERS, JSON.stringify(DEFAULT_ORDERS));
  return DEFAULT_ORDERS;
}

function saveLocalOrders(orders) {
  localStorage.setItem(STORAGE_LOCAL_ORDERS, JSON.stringify(orders));
}

export async function fetchOrders() {
  const client = getClient();
  if (client) {
    try {
      const { data, error } = await client.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data;
      }
      if (error) {
        console.warn('Supabase orders fetch error, using local:', error);
      }
    } catch (e) {
      console.warn('Supabase orders fetch error, using local:', e);
    }
  }
  return getLocalOrders();
}

export async function createOrder(order) {
  const client = getClient();
  if (!client) {
    throw new Error('Order service is unavailable. Please try again later.');
  }
  const initialHistory = Array.isArray(order.tracking_history) && order.tracking_history.length > 0
    ? order.tracking_history
    : [
        {
          status: order.status || 'Pending',
          title: 'Order Received & Confirmed',
          note: 'Your order has been recorded in the Furniture Hub system.',
          location: 'Dhangadhi Hub, Kailali',
          timestamp: order.created_at || new Date().toISOString()
        }
      ];

  if (client) {
    let customerEmail = order.customer_email || order.email || null;
    let orderNotes = order.notes || null;

    // Check for authenticated Supabase session
    try {
      const session = (await client.auth.getSession())?.data?.session;
      const authedEmail = session?.user?.email;
      if (!authedEmail) {
        throw new Error('Please sign in before placing an order.');
      }
      // Authenticated caller: bind to verified session email.
      customerEmail = authedEmail;
    } catch (error) {
      throw new Error(error?.message || 'Unable to verify your session. Please sign in again.');
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const initialId = order.id || ('FH-' + dateStr + '-' + Math.floor(100000 + Math.random() * 900000));

    const orderPayload = {
      id: initialId,
      customer_name: order.customer_name || order.name,
      customer_email: customerEmail,
      customer_phone: order.customer_phone || order.phone,
      delivery_address: order.delivery_address || order.address,
      items: order.items,
      total_amount: order.total_amount || order.total,
      payment_method: order.payment_method || order.paymentMethod || 'Cash on Delivery',
      status: order.status || 'Pending',
      notes: orderNotes,
      coupon_code: order.coupon_code || order.couponCode || null,
      tracking_history: initialHistory
    };

    // Sole functional authority: transactional place_order RPC with authoritative pricing, stock & ownership
    const MAX_RETRIES = 3;
    let persistedOrder = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const { data: rpcData, error: rpcError } = await client.rpc('place_order', { p_order: orderPayload });
      if (!rpcError && rpcData) {
        persistedOrder = typeof rpcData === 'object' ? rpcData : orderPayload;
        break;
      }

      // Check for Postgres unique constraint collision (code 23505)
      const isUniqueCollision = rpcError && (
        rpcError.code === '23505' ||
        (rpcError.message && (rpcError.message.includes('23505') || rpcError.message.toLowerCase().includes('duplicate key')))
      );

      if (isUniqueCollision && attempt < MAX_RETRIES - 1) {
        const retryDateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        orderPayload.id = 'FH-' + retryDateStr + '-' + Math.floor(100000 + Math.random() * 900000);
        continue;
      }

      console.error('place_order RPC rejected order:', rpcError);
      throw new Error(rpcError?.message || 'Database rejected order creation. Please verify order details.');
    }

    // Hydrate returned order merging authoritative RPC result with caller-side presentation fields
    const authoritativeTotal = persistedOrder && persistedOrder.total_amount != null 
      ? Number(persistedOrder.total_amount) 
      : (order.total_amount != null ? Number(order.total_amount) : Number(order.total || 0));

    const authoritativeOrder = {
      ...order,
      ...(persistedOrder || {}),
      id: persistedOrder?.id || orderPayload.id,
      reference: persistedOrder?.id || orderPayload.id,
      name: persistedOrder?.customer_name || order.customer_name || order.name,
      customer_name: persistedOrder?.customer_name || order.customer_name || order.name,
      phone: persistedOrder?.customer_phone || order.customer_phone || order.phone,
      customer_phone: persistedOrder?.customer_phone || order.customer_phone || order.phone,
      address: persistedOrder?.delivery_address || order.delivery_address || order.address,
      delivery_address: persistedOrder?.delivery_address || order.delivery_address || order.address,
      items: persistedOrder?.items || order.items,
      total: authoritativeTotal,
      total_amount: authoritativeTotal,
      paymentMethod: persistedOrder?.payment_method || order.payment_method || order.paymentMethod,
      payment_method: persistedOrder?.payment_method || order.payment_method || order.paymentMethod,
      status: persistedOrder?.status || order.status || 'Pending',
      tracking_history: persistedOrder?.tracking_history || initialHistory,
      created_at: persistedOrder?.created_at || order.created_at || new Date().toISOString()
    };

    const local = getLocalOrders();
    local.unshift(authoritativeOrder);
    saveLocalOrders(local);

    return authoritativeOrder;
  }

  throw new Error('Order service is unavailable. Please try again later.');
}

export async function fetchOrderByReference(orderRef, phone = null) {
  if (!orderRef) return null;
  const cleanRef = String(orderRef).trim().replace(/^#/, '');
  const cleanPhone = phone ? String(phone).trim() : null;

  const client = getClient();
  if (client) {
    // 1. Try secure RPC function returning safe tracking projection without PII
    try {
      const { data, error } = await client.rpc('track_order', {
        p_order_id: cleanRef,
        p_phone: cleanPhone
      });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data[0];
      }
      if (error) throw error;
    } catch (e) {
      console.warn('Order tracking lookup failed:', e);
      throw new Error('Unable to verify order tracking at this time.');
    }
    return null;
  }

  // 2. Fallback to local storage order records
  const localOrders = getLocalOrders();
  const foundLocal = localOrders.find(o => {
    const idMatch = (o.id && (o.id.toLowerCase() === cleanRef.toLowerCase() || o.id.toLowerCase() === `fh-${cleanRef}`.toLowerCase())) ||
      (o.reference && (o.reference.toLowerCase() === cleanRef.toLowerCase() || o.reference.toLowerCase() === `fh-${cleanRef}`.toLowerCase()));
    const phoneMatch = /^\d{10,15}$/.test(cleanPhone || '') &&
      String(o.customer_phone || o.phone || '').replace(/\D/g, '').slice(-10) === cleanPhone.slice(-10);
    return idMatch && phoneMatch;
  });
  if (foundLocal) return foundLocal;

  // 3. Fallback to customer profile saved orders
  if (typeof localStorage !== 'undefined') {
    try {
      const custOrders = JSON.parse(localStorage.getItem('fh_customer_orders') || '[]');
      const foundCust = custOrders.find(o => {
        const idMatch = (o.id && (o.id.toLowerCase() === cleanRef.toLowerCase() || o.id.toLowerCase() === `fh-${cleanRef}`.toLowerCase())) ||
          (o.reference && (o.reference.toLowerCase() === cleanRef.toLowerCase() || o.reference.toLowerCase() === `fh-${cleanRef}`.toLowerCase()));
        const phoneMatch = /^\d{10,15}$/.test(cleanPhone || '') &&
          String(o.customer_phone || o.phone || '').replace(/\D/g, '').slice(-10) === cleanPhone.slice(-10);
        return idMatch && phoneMatch;
      });
      if (foundCust) return foundCust;
    } catch (_) {}
  }

  return null;
}

export async function updateOrderStatus(orderId, status) {
  return await updateOrderTracking(orderId, { status });
}

export async function updateOrderTracking(orderId, { status, title, note, location }) {
  const client = getClient();
  const local = getLocalOrders();
  const order = local.find(o => o.id === orderId);

  const defaultTitles = {
    Pending: 'Order Received & Confirmed',
    Processing: 'Quality Checked & Packed',
    Shipped: 'Dispatched & Out for Delivery',
    Delivered: 'Delivered to Customer',
    Cancelled: 'Order Cancelled'
  };

  const newStatus = status || order?.status || 'Pending';
  const milestone = {
    status: newStatus,
    title: title || defaultTitles[newStatus] || `Status updated to ${newStatus}`,
    note: note || '',
    location: location || 'Dhangadhi Hub, Kailali',
    timestamp: new Date().toISOString()
  };

  let updatedHistory = order && Array.isArray(order.tracking_history) ? [...order.tracking_history] : [];
  updatedHistory.push(milestone);

  // Await and verify cloud mutation FIRST before mutating local state
  if (client) {
    const updatePayload = { status: newStatus };
    if (note) updatePayload.notes = note;
    if (updatedHistory.length > 0) {
      updatePayload.tracking_history = updatedHistory;
    }
    const { data, error } = await client.from('orders').update(updatePayload).eq('id', orderId).select();
    if (error) {
      console.error('Supabase updateOrderTracking failed:', error);
      throw new Error(`Failed to update order in cloud database: ${error.message}`);
    }
    if (!data || data.length === 0) {
      throw new Error(`Order #${orderId} was not found or could not be updated.`);
    }
  }

  // Update local cache strictly after cloud update succeeds
  if (order) {
    order.status = newStatus;
    if (note) order.notes = note;
    order.tracking_history = updatedHistory;
    saveLocalOrders(local);
  }

  return order;
}

export async function deleteOrder(orderId) {
  const client = getClient();
  // Await cloud delete FIRST before mutating local state
  if (client) {
    const { data, error } = await client.from('orders').delete().eq('id', orderId).select();
    if (error) {
      console.error('Supabase deleteOrder failed:', error);
      throw new Error(`Failed to delete order from cloud database: ${error.message}`);
    }
    if (!data || data.length === 0) {
      throw new Error(`Order #${orderId} was not found or could not be deleted.`);
    }
  }

  const local = getLocalOrders().filter(o => o.id !== orderId);
  saveLocalOrders(local);
  return { success: true };
}

// ==========================================================================
// STORE SETTINGS & COUPONS
// ==========================================================================

export const DEFAULT_HERO_BANNERS = [];

const DEFAULT_SETTINGS = {
  storeName: 'Furniture Hub Dhangadhi',
  contactEmail: 'support@furniturehubdhangadhi.com',
  phone: '+977 9841234567',
  whatsappNumber: '9779841234567',
  address: 'Main Road / Hasanpur, Dhangadhi, Kailali, Nepal',
  currency: 'Rs.',
  operatingHours: 'Sun - Fri, 9:00 AM - 7:00 PM',
  insideValleyFee: 250,
  outsideValleyFee: 500,
  freeShippingThreshold: 0,
  lowStockThreshold: 3,
  maintenanceMode: false,
  categories: [],
  heroBanners: DEFAULT_HERO_BANNERS
};

export async function fetchStoreSettings() {
  const client = getClient();
  if (client) {
    try {
      const { data, error } = await client.from('store_settings').select('*');
      if (!error && data && data.length > 0) {
        const merged = { ...DEFAULT_SETTINGS };
        data.forEach(row => {
          if (row.value && typeof row.value === 'object') {
            Object.assign(merged, row.value);
          }
        });
        if (!Array.isArray(merged.categories)) {
          merged.categories = [];
        }
        if (!Array.isArray(merged.heroBanners) || merged.heroBanners.length === 0) {
          merged.heroBanners = DEFAULT_HERO_BANNERS;
        }
        return merged;
      }
    } catch { /* ignore */ }
  }

  const stored = localStorage.getItem(STORAGE_LOCAL_SETTINGS);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        heroBanners: (Array.isArray(parsed.heroBanners) && parsed.heroBanners.length > 0)
          ? parsed.heroBanners
          : DEFAULT_HERO_BANNERS
      };
    } catch { /* ignore */ }
  }
  return { ...DEFAULT_SETTINGS };
}

export async function saveStoreSettings(settings) {
  const client = getClient();
  // Await cloud mutation FIRST before mutating local state
  if (client) {
    const { data, error } = await client.from('store_settings').upsert({
      key: 'general',
      value: settings
    }).select();
    if (error) {
      console.error('Supabase store_settings upsert error:', error);
      throw new Error(`Failed to save store settings to cloud database: ${error.message}`);
    }
    if (!data || data.length === 0) {
      throw new Error('Store settings could not be saved to cloud database.');
    }
  }

  localStorage.setItem(STORAGE_LOCAL_SETTINGS, JSON.stringify(settings));
  return settings;
}

export async function fetchCategories() {
  const settings = await fetchStoreSettings();
  return Array.isArray(settings.categories) ? settings.categories : [];
}

export async function saveCategory(categoryInput) {
  if (!isCurrentAdmin()) {
    throw new Error('Unauthorized: Administrator authentication required to create or modify categories.');
  }

  const settings = await fetchStoreSettings();
  const currentCategories = Array.isArray(settings.categories) ? settings.categories : [];

  const validated = validateCategoryInput(categoryInput, currentCategories);

  const existingIdx = currentCategories.findIndex(c =>
    String(c.id) === String(validated.id) ||
    (c.slug && c.slug.toLowerCase() === validated.slug.toLowerCase())
  );

  let updatedList;
  if (existingIdx >= 0) {
    updatedList = [...currentCategories];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...validated };
  } else {
    updatedList = [...currentCategories, validated];
  }

  const updatedSettings = {
    ...settings,
    categories: updatedList
  };

  await saveStoreSettings(updatedSettings);
  return validated;
}

export async function deleteCategory(categoryIdOrSlug) {
  if (!isCurrentAdmin()) {
    throw new Error('Unauthorized: Administrator authentication required to delete categories.');
  }

  const cleanTarget = String(categoryIdOrSlug || '').trim().toLowerCase();
  if (!cleanTarget) {
    throw new Error('Valid category identifier is required for deletion.');
  }

  const settings = await fetchStoreSettings();
  const currentCategories = Array.isArray(settings.categories) ? settings.categories : [];

  const updatedList = currentCategories.filter(c =>
    String(c.id).toLowerCase() !== cleanTarget &&
    String(c.slug || '').toLowerCase() !== cleanTarget
  );

  const updatedSettings = {
    ...settings,
    categories: updatedList
  };

  await saveStoreSettings(updatedSettings);
  return updatedList;
}

export async function fetchHeroBanners() {
  const settings = await fetchStoreSettings();
  return (Array.isArray(settings.heroBanners) && settings.heroBanners.length > 0)
    ? settings.heroBanners
    : DEFAULT_HERO_BANNERS;
}

export async function saveHeroBanner(bannerData) {
  if (!isCurrentAdmin()) {
    throw new Error('Unauthorized: Administrator authentication required to manage hero banners.');
  }
  if (!bannerData || !bannerData.url || typeof bannerData.url !== 'string') {
    throw new Error('A valid image URL is required for the banner.');
  }
  if (bannerData.url.length > 2_000_000) {
    throw new Error('Image is too large. Please use a smaller file (max ~1.5 MB after compression).');
  }

  const settings = await fetchStoreSettings();
  const banners = Array.isArray(settings.heroBanners) ? settings.heroBanners : [];

  const entry = {
    id: bannerData.id || `banner-${Date.now()}`,
    url: bannerData.url,
    alt: (bannerData.alt || 'Furniture Hub Dhangadhi').slice(0, 120),
    order: typeof bannerData.order === 'number' ? bannerData.order : banners.length,
    createdAt: bannerData.createdAt || new Date().toISOString()
  };

  const existingIdx = banners.findIndex(b => b.id === entry.id);
  let updatedList;
  if (existingIdx >= 0) {
    updatedList = [...banners];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...entry };
  } else {
    updatedList = [...banners, entry];
  }

  await saveStoreSettings({ ...settings, heroBanners: updatedList });
  return entry;
}

export async function deleteHeroBanner(bannerId) {
  if (!isCurrentAdmin()) {
    throw new Error('Unauthorized: Administrator authentication required to delete hero banners.');
  }
  const cleanId = String(bannerId || '').trim();
  if (!cleanId) throw new Error('Valid banner ID is required for deletion.');

  const settings = await fetchStoreSettings();
  const banners = Array.isArray(settings.heroBanners) ? settings.heroBanners : [];
  const updatedList = banners.filter(b => b.id !== cleanId);

  if (updatedList.length === banners.length) {
    throw new Error(`Banner "${cleanId}" was not found.`);
  }

  await saveStoreSettings({ ...settings, heroBanners: updatedList });
  return updatedList;
}

export async function fetchCoupons() {
  const client = getClient();
  if (client) {
    const { data, error } = await client.from('coupons').select('*');
    if (error) throw error;
    return (data || []).map(r => ({
      code: r.code,
      discountPercent: Number(r.discount_percent || 0),
      discountFixed: Number(r.discount_fixed || 0),
      minOrderAmount: Number(r.min_order_amount || 0),
      expiryDate: r.expiry_date,
      isActive: Boolean(r.is_active),
      usageCount: r.usage_count || 0
    }));
  }

  const stored = localStorage.getItem(STORAGE_LOCAL_COUPONS);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* ignore */ }
  }
  return [];
}

export async function saveCoupon(coupon) {
  const client = getClient();
  // Await cloud mutation FIRST before mutating local state
  if (client) {
    const { data, error } = await client.from('coupons').upsert({
      code: coupon.code.toUpperCase(),
      discount_percent: coupon.discountPercent,
      min_order_amount: coupon.minOrderAmount || 0,
      is_active: coupon.isActive !== false
    }).select();
    if (error) {
      console.error('Supabase coupon upsert error:', error);
      throw new Error(`Failed to save coupon to cloud database: ${error.message}`);
    }
    if (!data || data.length === 0) {
      throw new Error('Coupon could not be saved to cloud database.');
    }
  }

  const local = await fetchCoupons();
  const idx = local.findIndex(c => c.code.toUpperCase() === coupon.code.toUpperCase());
  if (idx >= 0) local[idx] = { ...local[idx], ...coupon };
  else local.push(coupon);
  localStorage.setItem(STORAGE_LOCAL_COUPONS, JSON.stringify(local));

  return coupon;
}

export async function deleteCoupon(code) {
  const client = getClient();
  // Await cloud delete FIRST before mutating local state
  if (client) {
    const { data, error } = await client.from('coupons').delete().eq('code', code.toUpperCase()).select();
    if (error) {
      console.error('Supabase coupon delete error:', error);
      throw new Error(`Failed to delete coupon from cloud database: ${error.message}`);
    }
    if (!data || data.length === 0) {
      throw new Error(`Coupon "${code}" was not found or could not be deleted.`);
    }
  }

  const local = (await fetchCoupons()).filter(c => c.code.toUpperCase() !== code.toUpperCase());
  localStorage.setItem(STORAGE_LOCAL_COUPONS, JSON.stringify(local));
}
