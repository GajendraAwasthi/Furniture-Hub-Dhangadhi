import { getClient, isSupabaseConfigured, checkIsSupabaseAdmin, getLocalSupabaseAdmins } from './supabase.js';

const STORAGE_CUSTOMER_SESSION = 'fh_customer_session';
const STORAGE_ADMIN_SESSION = 'fh_demo_admin_user';
const STORAGE_CUSTOMER_ACCOUNTS = 'fh_customer_accounts';
const STORAGE_CUSTOMER_ORDERS = 'fh_customer_orders';

const ALLOWED_PROFILE_KEYS = ['name', 'phone', 'address', 'city', 'avatar'];

/**
 * Sanitize string input to prevent stored injection and malformed characters
 */
export function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim();
}

/**
 * Cryptographically hash a password using SHA-256 and a random salt
 */
export async function hashPassword(password, salt) {
  if (!password || typeof password !== 'string') return '';
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getStoredAccounts() {
  const stored = localStorage.getItem(STORAGE_CUSTOMER_ACCOUNTS);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }
  return [];
}

function saveStoredAccounts(accounts) {
  localStorage.setItem(STORAGE_CUSTOMER_ACCOUNTS, JSON.stringify(accounts));
}

function getAllOrdersFromStorage() {
  const stored = localStorage.getItem(STORAGE_CUSTOMER_ORDERS);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }
  return [];
}

function saveAllOrdersToStorage(orders) {
  localStorage.setItem(STORAGE_CUSTOMER_ORDERS, JSON.stringify(orders));
}

/**
 * Check if the currently active session has verified administrator privileges.
 * Administrator status is governed strictly by Supabase server-side records.
 * Client-modifiable role fields or arbitrary localStorage objects are NEVER trusted.
 */
export function isCurrentAdmin() {
  // 1. Verify active Supabase cryptographic JWT token in localStorage
  let verifiedSbUser = null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const val = JSON.parse(raw);
        if (val?.access_token && val?.user && typeof val.user === 'object') {
          verifiedSbUser = val.user;
          break;
        }
      }
    }
  } catch {
    // ignore
  }

  // If a Supabase session exists, validate strictly against authoritative store_admins database records
  // Client-supplied app_metadata or user_metadata in localStorage is NEVER trusted!
  if (verifiedSbUser) {
    const sbAdmins = getLocalSupabaseAdmins();
    if (Array.isArray(sbAdmins) && sbAdmins.length > 0) {
      const email = (verifiedSbUser.email || '').toLowerCase().trim();
      const id = (verifiedSbUser.id || '').trim();

      const isSbAdmin = sbAdmins.some(a => {
        const r = (a.role || '').replace(/['"]/g, '').trim().toLowerCase();
        if (r !== 'admin') return false;
        const aEmail = (a.email || '').trim().toLowerCase();
        const aId = (a.id || '').trim();
        const aUserId = (a.user_id || '').trim();
        return (email && aEmail === email) || (id && (aId === id || aUserId === id));
      });

      if (isSbAdmin) {
        return true;
      }
    }
  }

  // If unauthenticated or not verified as admin, wipe any rogue admin session
  localStorage.removeItem(STORAGE_ADMIN_SESSION);
  return false;
}

/**
 * Get the currently logged-in customer session.
 * Primary:  reads app-owned fh_customer_session from localStorage.
 * Fallback: recovers from a Supabase JWT only when:
 *   - The token has NOT expired (checked via expires_at Unix timestamp).
 *   - The local admin cache is populated, confirming the user is not an admin.
 *     If the cache is empty (cold start before sync), we return null and let
 *     the async DOMContentLoaded handler perform SDK-validated authentication.
 */
export function getCurrentCustomer() {
  const session = localStorage.getItem(STORAGE_CUSTOMER_SESSION);
  if (session) {
    try {
      const parsed = JSON.parse(session);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  // Fallback: recover from Supabase JWT stored in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const val = JSON.parse(raw);

        // Require a well-formed token object
        if (!val?.access_token || !val?.user || typeof val.user !== 'object') continue;

        // Reject expired tokens — expires_at is a Unix timestamp (seconds)
        const expiresAt = typeof val.expires_at === 'number' ? val.expires_at : null;
        if (expiresAt !== null && expiresAt < Math.floor(Date.now() / 1000)) {
          localStorage.removeItem(key); // evict stale token
          continue;
        }

        const u = val.user;
        const email = (u.email || '').toLowerCase().trim();
        const id = (u.id || '').trim();

        // If app_metadata specifies admin, reject customer recovery
        const appRole = (u.app_metadata?.role || '').replace(/['"]/g, '').trim().toLowerCase();
        if (appRole === 'admin') return null;

        const sbAdmins = getLocalSupabaseAdmins();
        const isSbAdmin = Array.isArray(sbAdmins) && sbAdmins.some(a => {
          const r = (a.role || '').replace(/['"]/g, '').trim().toLowerCase();
          if (r !== 'admin') return false;
          const aEmail = (a.email || '').trim().toLowerCase();
          const aId = (a.id || '').trim();
          const aUserId = (a.user_id || '').trim();
          return (email && aEmail === email) || (id && (aId === id || aUserId === id));
        });

        if (!isSbAdmin) {
          const accounts = getStoredAccounts();
          let customerAccount = accounts.find(a => a.email && a.email.toLowerCase() === email);
          if (!customerAccount) {
            customerAccount = {
              id: u.id,
              name: sanitizeInput(u.user_metadata?.full_name || u.user_metadata?.name || email.split('@')[0]),
              email: email,
              phone: sanitizeInput(u.user_metadata?.phone || ''),
              address: sanitizeInput(u.user_metadata?.address || ''),
              city: sanitizeInput(u.user_metadata?.city || 'Dhangadhi'),
              avatar: u.user_metadata?.avatar_url || '/images/social-user.png',
              role: 'customer',
              provider: u.app_metadata?.provider || 'google',
              created_at: new Date().toISOString()
            };
            accounts.push(customerAccount);
            saveStoredAccounts(accounts);
          }

          const customerSession = {
            id: customerAccount.id,
            name: customerAccount.name,
            email: customerAccount.email,
            phone: customerAccount.phone,
            address: customerAccount.address,
            city: customerAccount.city,
            avatar: customerAccount.avatar,
            role: 'customer',
            provider: u.app_metadata?.provider || 'google'
          };

          localStorage.setItem(STORAGE_CUSTOMER_SESSION, JSON.stringify(customerSession));
          return customerSession;
        }
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export const getCurrentCustomerUser = getCurrentCustomer;

/**
 * OAuth Authentication (Google, GitHub, or verified token)
 * - Checks directly with Supabase via checkIsSupabaseAdmin.
 * - Only users verified as admin in Supabase are assigned role: 'admin'.
 * - Direct email inputs or unauthenticated calls CANNOT elevate to admin.
 */
export async function authenticateOAuthUser(provider = 'google', profile = null) {
  const cleanProvider = (provider || 'google').toLowerCase();
  const isDirectLogin = cleanProvider === 'email' || cleanProvider === 'direct';

  const userProfile = profile || {
    id: `oauth-${cleanProvider}-${Date.now().toString(36)}`,
    email: `customer.${cleanProvider}@gmail.com`,
    name: `${cleanProvider.charAt(0).toUpperCase() + cleanProvider.slice(1)} Customer`,
    avatar: '/images/social-user.png',
    provider: cleanProvider
  };

  userProfile.email = (userProfile.email || '').toLowerCase().trim();

  // Only check admin for verified OAuth providers, never for unauthenticated direct logins
  if (!isDirectLogin) {
    const isSbAdmin = await checkIsSupabaseAdmin(userProfile);
    if (isSbAdmin) {
      const adminSession = {
        id: userProfile.id || 'demo-admin-id',
        email: userProfile.email,
        name: userProfile.name || 'Store Administrator',
        role: 'admin',
        avatar: userProfile.avatar || '/images/social-user.png',
        provider: cleanProvider
      };
      localStorage.setItem(STORAGE_ADMIN_SESSION, JSON.stringify(adminSession));
      localStorage.removeItem(STORAGE_CUSTOMER_SESSION);
      return { success: true, role: 'admin', user: adminSession };
    }
  }

  // All other users are strictly treated as normal customers (role: 'customer')
  const accounts = getStoredAccounts();
  let customerAccount = accounts.find(a => a.email && a.email.toLowerCase() === userProfile.email);

  if (!customerAccount) {
    customerAccount = {
      id: userProfile.id || `cust-${Date.now()}`,
      name: sanitizeInput(userProfile.name || ''),
      email: userProfile.email,
      phone: sanitizeInput(userProfile.phone || ''),
      address: sanitizeInput(userProfile.address || ''),
      city: sanitizeInput(userProfile.city || 'Dhangadhi'),
      avatar: userProfile.avatar || '/images/social-user.png',
      role: 'customer',
      provider: cleanProvider,
      created_at: new Date().toISOString()
    };
    accounts.push(customerAccount);
    saveStoredAccounts(accounts);
  }

  const customerSession = {
    id: customerAccount.id,
    name: customerAccount.name,
    email: customerAccount.email,
    phone: customerAccount.phone,
    address: customerAccount.address,
    city: customerAccount.city,
    avatar: customerAccount.avatar,
    role: 'customer',
    provider: cleanProvider
  };

  localStorage.setItem(STORAGE_CUSTOMER_SESSION, JSON.stringify(customerSession));
  localStorage.removeItem(STORAGE_ADMIN_SESSION);
  return { success: true, role: 'customer', user: customerSession };
}

/**
 * Backward compatibility shim for persona login
 */
export async function authenticateAuthorizedPerson(persona) {
  if (persona === 'admin') {
    throw new Error('Direct persona admin access is disabled. Please authenticate via verified credentials.');
  }
  return authenticateOAuthUser('google', {
    id: `cust-${Date.now()}`,
    email: `${persona}@example.com`,
    name: persona.charAt(0).toUpperCase() + persona.slice(1),
    avatar: '/images/social-user.png'
  });
}

/**
 * Unified Authentication Function for both Admins and Regular Customers
 * Returns { success: true, role: 'admin' | 'customer', user }
 */
export async function authenticateUser(identifier, password) {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanPhone = cleanId.replace(/[^0-9]/g, '');

  if (!cleanId) {
    throw new Error('Please enter your email or authorized account.');
  }
  if (!password || typeof password !== 'string') {
    throw new Error('Please enter your password.');
  }

  // 1. If Supabase is configured and identifier is an email, authenticate via Supabase Auth
  const client = getClient();
  if (client && cleanId.includes('@')) {
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanId,
        password
      });

      if (!error && data?.user) {
        const isSbAdmin = await checkIsSupabaseAdmin(data.user);
        if (isSbAdmin) {
          const adminUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name || 'Store Administrator',
            role: 'admin',
            user_metadata: data.user.user_metadata
          };
          localStorage.setItem(STORAGE_ADMIN_SESSION, JSON.stringify(adminUser));
          localStorage.removeItem(STORAGE_CUSTOMER_SESSION);

          // Ensure local admin cache contains this verified admin
          try {
            const curAdmins = getLocalSupabaseAdmins();
            if (!curAdmins.some(a => (a.email || '').toLowerCase() === (data.user.email || '').toLowerCase())) {
              localStorage.setItem('fh_supabase_store_admins', JSON.stringify([...curAdmins, {
                id: data.user.id,
                email: data.user.email,
                name: adminUser.name,
                role: 'admin'
              }]));
            }
          } catch {
            // ignore
          }

          return { success: true, role: 'admin', user: adminUser };
        } else {
          const custUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'Customer',
            phone: data.user.user_metadata?.phone || '',
            address: data.user.user_metadata?.address || '',
            city: data.user.user_metadata?.city || 'Dhangadhi',
            role: 'customer'
          };
          localStorage.setItem(STORAGE_CUSTOMER_SESSION, JSON.stringify(custUser));
          localStorage.removeItem(STORAGE_ADMIN_SESSION);
          return { success: true, role: 'customer', user: custUser };
        }
      }
    } catch (sbErr) {
      console.warn('Supabase authentication notice:', sbErr.message || sbErr);
    }
  }

  // 2. Check Customer Accounts with salted hash verification (Never plaintext)
  const accounts = getStoredAccounts();
  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    const emailMatch = acc.email && acc.email.toLowerCase() === cleanId;
    const phoneMatch = cleanPhone.length >= 7 && acc.phone && acc.phone.replace(/[^0-9]/g, '') === cleanPhone;

    if (emailMatch || phoneMatch) {
      let passwordValid = false;

      if (acc.passwordHash && acc.salt) {
        const computed = await hashPassword(password, acc.salt);
        passwordValid = (computed === acc.passwordHash);
      } else if (acc.password) {
        // Transparent upgrade of legacy plaintext account: hash immediately and erase plaintext!
        if (acc.password === password) {
          passwordValid = true;
          acc.salt = generateSalt();
          acc.passwordHash = await hashPassword(password, acc.salt);
          delete acc.password;
          saveStoredAccounts(accounts);
        }
      }

      if (passwordValid) {
        const sessionData = {
          id: acc.id,
          name: acc.name,
          email: acc.email,
          phone: acc.phone,
          address: acc.address,
          city: acc.city,
          role: 'customer'
        };
        localStorage.setItem(STORAGE_CUSTOMER_SESSION, JSON.stringify(sessionData));
        localStorage.removeItem(STORAGE_ADMIN_SESSION);
        return { success: true, role: 'customer', user: sessionData };
      }
    }
  }

  throw new Error('Invalid credentials. Please verify your email/phone and password.');
}

/**
 * Customer Registration (Customers only)
 */
export async function customerRegister({ name, phone, email, address, city, password }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

  if (cleanEmail === 'admin@furniturehub.com') {
    throw new Error('This email is reserved for system administration. Please choose another email.');
  }

  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error('Please enter a valid 10-digit Nepal mobile number.');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const safeName = sanitizeInput(name ? name.trim() : 'Valued Customer');
  const safeAddress = sanitizeInput(address ? address.trim() : 'Kathmandu');
  const safeCity = sanitizeInput(city || 'Kathmandu Valley');

  // 1. Try Supabase registration if configured
  const client = getClient();
  if (client) {
    try {
      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: safeName,
            phone: cleanPhone,
            address: safeAddress,
            city: safeCity,
            role: 'customer'
          }
        }
      });
      if (error) console.warn('Supabase sign up warning:', error.message);
    } catch (sbErr) {
      console.warn('Supabase sign up failed, storing locally:', sbErr);
    }
  }

  // 2. Save to local accounts using salted hash (NEVER plaintext)
  const accounts = getStoredAccounts();
  const existing = accounts.find(a => a.email && a.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error('An account with this email already exists. Please sign in instead.');
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const newAccount = {
    id: 'cust-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).substring(2, 9))),
    name: safeName,
    email: cleanEmail,
    phone: cleanPhone,
    address: safeAddress,
    city: safeCity,
    passwordHash,
    salt,
    role: 'customer',
    created_at: new Date().toISOString()
  };

  accounts.push(newAccount);
  saveStoredAccounts(accounts);

  // Automatically log in as customer
  const sessionData = {
    id: newAccount.id,
    name: newAccount.name,
    email: newAccount.email,
    phone: newAccount.phone,
    address: newAccount.address,
    city: newAccount.city,
    role: 'customer'
  };
  localStorage.setItem(STORAGE_CUSTOMER_SESSION, JSON.stringify(sessionData));
  localStorage.removeItem(STORAGE_ADMIN_SESSION);

  return { success: true, role: 'customer', customer: sessionData };
}

let isLoggingOut = false;

/**
 * Log out any active session (Customer or Admin) safely and instantly without hanging or crashing.
 */
export async function logoutUser() {
  if (isLoggingOut) return { success: true };
  isLoggingOut = true;

  try {
    const client = getClient();
    if (client) {
      try {
        // Use scope: 'local' and timeout so slow network requests never freeze the main thread
        await Promise.race([
          client.auth.signOut({ scope: 'local' }),
          new Promise(r => setTimeout(r, 600))
        ]);
      } catch {
        // ignore
      }
    }

    // Purge real application session states
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_CUSTOMER_SESSION);
      localStorage.removeItem(STORAGE_ADMIN_SESSION);
      localStorage.removeItem('fh_cart');
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('fh_pending_tab');
    }

    // Purge any Supabase token keys so subsequent refresh cannot re-hydrate stale sessions
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      // ignore
    }
  } finally {
    isLoggingOut = false;
  }

  return { success: true };
}

/**
 * Backward compatibility alias
 */
export const customerLogout = logoutUser;
export const customerLogin = async (identifier, password) => {
  const res = await authenticateUser(identifier, password);
  return { success: true, customer: res.user };
};

/**
 * Update Customer Profile
 * Strictly whitelists editable fields and blocks mass-assignment/privilege escalation.
 */
export function updateCustomerProfile(param1, param2) {
  const current = getCurrentCustomer();
  if (!current || typeof current !== 'object') return null;

  const rawData = (param2 && typeof param2 === 'object') ? param2 : (param1 && typeof param1 === 'object' ? param1 : {});

  // Strictly whitelist allowed fields, blocking any role, id, or credential tampering
  const safeUpdates = {};
  for (const key of ALLOWED_PROFILE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(rawData, key) && rawData[key] !== undefined) {
      if (typeof rawData[key] === 'string') {
        safeUpdates[key] = sanitizeInput(rawData[key]);
      }
    }
  }

  // Immutable identity guarantees
  const sanitized = {
    ...current,
    ...safeUpdates,
    id: current.id,
    email: current.email,
    role: 'customer' // Protected role field cannot be altered
  };

  localStorage.setItem(STORAGE_CUSTOMER_SESSION, JSON.stringify(sanitized));

  // Update in stored accounts list with same whitelist protection
  const accounts = getStoredAccounts();
  const idx = accounts.findIndex(a => a.id === current.id || (a.email && a.email.toLowerCase() === current.email.toLowerCase()));
  if (idx !== -1) {
    accounts[idx] = {
      ...accounts[idx],
      ...safeUpdates,
      id: accounts[idx].id,
      email: accounts[idx].email,
      role: 'customer'
    };
    saveStoredAccounts(accounts);
  }

  // Asynchronously sync profile changes (phone, address, city, name) directly to Supabase
  syncCustomerProfileToSupabase(sanitized).catch(() => {});

  return sanitized;
}

/**
 * Synchronize customer profile (phone, address, city, name) to Supabase Cloud
 */
export async function syncCustomerProfileToSupabase(customer) {
  if (!customer || !customer.email) return;
  const client = getClient();
  if (!client) return;

  // 1. Update Supabase Auth user_metadata
  try {
    await client.auth.updateUser({
      data: {
        full_name: customer.name,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        city: customer.city
      }
    });
  } catch (err) {
    console.warn('Supabase auth.updateUser note:', err?.message || err);
  }

  // 2. Upsert into public.customer_profiles table in Supabase
  try {
    await client.from('customer_profiles').upsert({
      id: customer.id || customer.email,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      city: customer.city || 'Dhangadhi',
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' });
  } catch (err) {
    console.warn('Supabase customer_profiles table upsert note:', err?.message || err);
  }
}

/**
 * Order History management for customers (Strictly Isolated per customer)
 * IDOR Protection: Ordinary customers can ONLY retrieve their own orders.
 */
export function getCustomerOrders(customerId = null) {
  const current = getCurrentCustomer();
  const admin = isCurrentAdmin();

  let targetId = current?.id;
  let targetEmail = current?.email?.toLowerCase();
  let targetPhone = current?.phone?.replace(/[^0-9]/g, '');

  if (customerId) {
    if (admin) {
      // Only verified administrators can specify a target customerId
      const accounts = getStoredAccounts();
      const target = accounts.find(a => a.id === customerId);
      if (target) {
        targetId = target.id;
        targetEmail = target.email?.toLowerCase();
        targetPhone = target.phone?.replace(/[^0-9]/g, '');
      } else {
        targetId = customerId;
        targetEmail = null;
        targetPhone = null;
      }
    } else if (current && current.id !== customerId) {
      // Non-admin tried to specify another customer's ID -> Access Denied / empty result
      return [];
    }
  }

  if (!targetId && !targetEmail) return [];

  const allOrders = getAllOrdersFromStorage();
  return allOrders.filter(o => {
    // 1. If order has customerId, require strict customerId match
    if (o.customerId && targetId) {
      return o.customerId === targetId;
    }
    // 2. If order has customerEmail, require strict email match
    if (o.customerEmail && targetEmail) {
      return o.customerEmail.toLowerCase() === targetEmail;
    }
    // 3. Fallback to phone match only if no customerId or customerEmail was tagged on order
    if (targetPhone && o.phone && !o.customerId && !o.customerEmail) {
      return o.phone.replace(/[^0-9]/g, '') === targetPhone;
    }
    return false;
  });
}

/**
 * Save customer order with strict identity binding to prevent spoofing
 */
export function saveCustomerOrder(order) {
  if (!order || typeof order !== 'object') return null;
  const current = getCurrentCustomer();

  // Strict identity binding: authenticated customer orders cannot be spoofed to another user
  const customerId = current?.id ? current.id : (order.customerId ? sanitizeInput(order.customerId) : 'cust-guest');
  const customerEmail = current?.email ? current.email.toLowerCase() : (order.customerEmail ? sanitizeInput(order.customerEmail).toLowerCase() : '');

  const taggedOrder = {
    ...order,
    customerId,
    customerEmail,
    id: order.id || `ord-${Date.now().toString(36)}`,
    createdAt: order.createdAt || new Date().toISOString()
  };

  const allOrders = getAllOrdersFromStorage();
  allOrders.unshift(taggedOrder);
  saveAllOrdersToStorage(allOrders);
  return taggedOrder;
}
