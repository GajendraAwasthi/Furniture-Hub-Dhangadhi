import { createClient } from '@supabase/supabase-js';
import initialProducts from '../data/products.json' with { type: 'json' };

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
    // Local / Demo Mock Login
    if (email === 'admin@furniturehub.com' && password === 'admin123') {
      const demoUser = {
        id: 'demo-admin-id',
        email: 'admin@furniturehub.com',
        user_metadata: { full_name: 'Store Administrator', role: 'admin' }
      };
      localStorage.setItem(STORAGE_DEMO_USER, JSON.stringify(demoUser));
      return { user: demoUser, session: { access_token: 'demo-token' } };
    } else {
      throw new Error('Invalid email or password. Use demo login or set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
    }
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
    throw new Error('Supabase is not configured yet. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file to register new accounts.');
  }
}

// Storage key for Supabase store admins table simulation/cache
const STORAGE_SUPABASE_ADMINS = 'fh_supabase_store_admins';

const DEFAULT_SUPABASE_ADMINS = [
  { id: 'admin-sb-01', email: 'admin@furniturehub.com', name: 'Store Administrator', role: 'admin', created_at: '2026-08-01T00:00:00Z' }
];

export function getLocalSupabaseAdmins() {
  try {
    const raw = localStorage.getItem(STORAGE_SUPABASE_ADMINS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_SUPABASE_ADMINS;
}

export function saveLocalSupabaseAdmins(admins) {
  localStorage.setItem(STORAGE_SUPABASE_ADMINS, JSON.stringify(admins));
}

/**
 * Strict Supabase Admin Verification
 * Administrator role is validated directly from Supabase (app_metadata, user_metadata, or store_admins table).
 * Other people than admin are normal customers.
 */
export async function checkIsSupabaseAdmin(user) {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const userId = user.id;

  const client = getClient();
  if (client) {
    try {
      // 1. Check user metadata directly in Supabase
      if (user.app_metadata?.role === 'admin' || user.user_metadata?.role === 'admin') {
        return true;
      }

      // 2. Query Supabase 'store_admins' table
      const { data, error } = await client
        .from('store_admins')
        .select('id, email, role')
        .or(`email.eq.${email},user_id.eq.${userId}`)
        .limit(1);

      if (!error && data && data.length > 0) {
        return data[0].role === 'admin';
      }
    } catch (e) {
      console.warn('Supabase admin role verification warning:', e);
    }
  }

  // Local Supabase check: only accounts verified in the store_admins list are admins
  const admins = getLocalSupabaseAdmins();
  const found = admins.find(a => a.email.toLowerCase() === email || a.id === userId);
  return Boolean(found && found.role === 'admin');
}

/**
 * Fetch all admins registered in Supabase
 */
export async function getSupabaseAdmins() {
  const client = getClient();
  if (client) {
    try {
      const { data, error } = await client.from('store_admins').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data;
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
  const redirectUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_AUTH_REDIRECT_URL) || `${window.location.origin}/#auth-callback`;

  if (client) {
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl
      }
    });
    if (error) throw error;
    return data;
  } else {
    // Fallback demo OAuth simulation (Google / GitHub)
    const demoUser = {
      id: `oauth-${provider}-user`,
      email: `user@${provider}.com`,
      user_metadata: { full_name: `${provider.toUpperCase()} Authorized Customer`, role: 'customer', provider }
    };
    return { user: demoUser };
  }
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
  const demo = localStorage.getItem(STORAGE_DEMO_USER);
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

function getLocalProducts() {
  try {
    localStorage.removeItem('fh_local_products'); // Clean any legacy demo products cache
    const stored = localStorage.getItem(STORAGE_LOCAL_PRODUCTS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  localStorage.setItem(STORAGE_LOCAL_PRODUCTS, JSON.stringify([]));
  return [];
}

function saveLocalProducts(products) {
  localStorage.setItem(STORAGE_LOCAL_PRODUCTS, JSON.stringify(products));
}

export async function fetchProducts() {
  const client = getClient();
  if (client) {
    try {
      const { data, error } = await client.from('products').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map(normalizeProductFromDb);
      }
    } catch (e) {
      console.warn('Supabase product fetch failed, using local store:', e);
    }
  }
  return getLocalProducts();
}

function normalizeProductFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    rating: Number(row.rating || 5),
    reviewCount: Number(row.review_count || 0),
    tag: row.tag || row.category,
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
  // Always update local storage
  const local = getLocalProducts();
  const idx = local.findIndex(p => p.id === product.id);
  if (idx >= 0) {
    local[idx] = { ...local[idx], ...product };
  } else {
    local.unshift(product);
  }
  saveLocalProducts(local);

  // Sync to Supabase if connected
  if (client) {
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
    const { error } = await client.from('products').upsert(payload);
    if (error) console.error('Supabase product upsert error:', error);
  }

  return product;
}

export async function deleteProduct(productId) {
  const client = getClient();
  const local = getLocalProducts().filter(p => p.id !== productId);
  saveLocalProducts(local);

  if (client) {
    const { error } = await client.from('products').delete().eq('id', productId);
    if (error) console.error('Supabase product delete error:', error);
  }
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
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn('Supabase orders fetch error, using local:', e);
    }
  }
  return getLocalOrders();
}

export async function createOrder(order) {
  const client = getClient();
  const local = getLocalOrders();
  local.unshift(order);
  saveLocalOrders(local);

  if (client) {
    try {
      await client.from('orders').insert({
        id: order.id,
        customer_name: order.customer_name || order.name,
        customer_email: order.customer_email || order.email || null,
        customer_phone: order.customer_phone || order.phone,
        delivery_address: order.delivery_address || order.address,
        items: order.items,
        total_amount: order.total_amount || order.total,
        payment_method: order.payment_method || order.paymentMethod,
        status: order.status || 'Pending'
      });
    } catch (e) {
      console.warn('Could not write order to Supabase:', e);
    }
  }
  return order;
}

export async function updateOrderStatus(orderId, status) {
  const client = getClient();
  const local = getLocalOrders();
  const order = local.find(o => o.id === orderId);
  if (order) {
    order.status = status;
    saveLocalOrders(local);
  }

  if (client) {
    await client.from('orders').update({ status }).eq('id', orderId);
  }
}

export async function deleteOrder(orderId) {
  const client = getClient();
  const local = getLocalOrders().filter(o => o.id !== orderId);
  saveLocalOrders(local);

  if (client) {
    await client.from('orders').delete().eq('id', orderId);
  }
}

// ==========================================================================
// STORE SETTINGS & COUPONS
// ==========================================================================

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
  maintenanceMode: false
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
        return merged;
      }
    } catch { /* ignore */ }
  }

  const stored = localStorage.getItem(STORAGE_LOCAL_SETTINGS);
  if (stored) {
    try { return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }; } catch { /* ignore */ }
  }
  return DEFAULT_SETTINGS;
}

export async function saveStoreSettings(settings) {
  const client = getClient();
  localStorage.setItem(STORAGE_LOCAL_SETTINGS, JSON.stringify(settings));

  if (client) {
    try {
      await client.from('store_settings').upsert({
        key: 'general',
        value: settings
      });
    } catch (e) {
      console.warn('Failed to persist settings in Supabase:', e);
    }
  }
  return settings;
}

const DEFAULT_COUPONS = [
  { code: 'HUB10', discountPercent: 10, minOrderAmount: 5000, isActive: true, usageCount: 0 }
];

export async function fetchCoupons() {
  const client = getClient();
  if (client) {
    try {
      const { data, error } = await client.from('coupons').select('*');
      if (!error && data && data.length > 0) {
        return data.map(r => ({
          code: r.code,
          discountPercent: r.discount_percent,
          minOrderAmount: Number(r.min_order_amount || 0),
          isActive: Boolean(r.is_active),
          usageCount: r.usage_count || 0
        }));
      }
    } catch { /* ignore */ }
  }

  const stored = localStorage.getItem(STORAGE_LOCAL_COUPONS);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* ignore */ }
  }
  return DEFAULT_COUPONS;
}

export async function saveCoupon(coupon) {
  const client = getClient();
  const local = await fetchCoupons();
  const idx = local.findIndex(c => c.code.toUpperCase() === coupon.code.toUpperCase());
  if (idx >= 0) local[idx] = { ...local[idx], ...coupon };
  else local.push(coupon);
  localStorage.setItem(STORAGE_LOCAL_COUPONS, JSON.stringify(local));

  if (client) {
    try {
      await client.from('coupons').upsert({
        code: coupon.code.toUpperCase(),
        discount_percent: coupon.discountPercent,
        min_order_amount: coupon.minOrderAmount || 0,
        is_active: coupon.isActive !== false
      });
    } catch { /* ignore */ }
  }
  return coupon;
}

export async function deleteCoupon(code) {
  const client = getClient();
  const local = (await fetchCoupons()).filter(c => c.code.toUpperCase() !== code.toUpperCase());
  localStorage.setItem(STORAGE_LOCAL_COUPONS, JSON.stringify(local));

  if (client) {
    try {
      await client.from('coupons').delete().eq('code', code.toUpperCase());
    } catch { /* ignore */ }
  }
}
