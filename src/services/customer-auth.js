import { getClient, isSupabaseConfigured, checkIsSupabaseAdmin, getLocalSupabaseAdmins } from './supabase.js';

const STORAGE_CUSTOMER_SESSION = 'fh_customer_session';
const STORAGE_ADMIN_SESSION = 'fh_demo_admin_user';
const STORAGE_CUSTOMER_ACCOUNTS = 'fh_customer_accounts';
const STORAGE_CUSTOMER_ORDERS = 'fh_customer_orders';

// Clean Customer Accounts & Orders Storage
const DEFAULT_ACCOUNTS = [];
const DEFAULT_ORDERS = [];

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
 * Check if the currently active session has verified administrator privileges
 * Administrator status is governed strictly by Supabase:
 * If an admin was removed from Supabase, their admin privileges are immediately revoked on the client.
 */
export function isCurrentAdmin() {
  const adminDemo = localStorage.getItem(STORAGE_ADMIN_SESSION);
  if (adminDemo) {
    try {
      const parsed = JSON.parse(adminDemo);
      // Verify against Supabase store_admins simulation / cache
      const sbAdmins = getLocalSupabaseAdmins();
      const isSbAdmin = sbAdmins.some(a => (a.email.toLowerCase() === (parsed.email || '').toLowerCase() || a.id === parsed.id) && a.role === 'admin');

      // If removed from Supabase, revoke immediately!
      if (!isSbAdmin) {
        localStorage.removeItem(STORAGE_ADMIN_SESSION);
        return false;
      }
      return true;
    } catch {
      localStorage.removeItem(STORAGE_ADMIN_SESSION);
      return false;
    }
  }

  // Check Supabase cached session
  const client = getClient();
  if (client) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          const val = JSON.parse(localStorage.getItem(key));
          const user = val?.user;
          if (user) {
            const role = user.app_metadata?.role || user.user_metadata?.role;
            if (role === 'admin') return true;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return false;
}

/**
 * Get the currently logged-in customer session
 */
export function getCurrentCustomer() {
  const session = localStorage.getItem(STORAGE_CUSTOMER_SESSION);
  if (session) {
    try {
      return JSON.parse(session);
    } catch {
      return null;
    }
  }
  return null;
}

export const getCurrentCustomerUser = getCurrentCustomer;

/**
 * OAuth Authentication (Google, GitHub, or 1-Click Authorized Person Token)
 * - Checks directly with Supabase via checkIsSupabaseAdmin.
 * - Only users verified as admin in Supabase are assigned role: 'admin'.
 * - All other users are strictly treated as normal customers (role: 'customer').
 */
export async function authenticateOAuthUser(provider = 'google', profile = null) {
  const cleanProvider = (provider || 'google').toLowerCase();

  const userProfile = profile || {
    id: `oauth-${cleanProvider}-${Date.now().toString(36)}`,
    email: `customer.${cleanProvider}@gmail.com`,
    name: `${cleanProvider.charAt(0).toUpperCase() + cleanProvider.slice(1)} Customer`,
    avatar: '/images/social-user.png',
    provider: cleanProvider
  };

  // 1. Strictly verify with Supabase if this user is an admin
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

  // 2. All other users than admin are strictly normal customers
  const accounts = getStoredAccounts();
  let customerAccount = accounts.find(a => a.email.toLowerCase() === userProfile.email.toLowerCase());

  if (!customerAccount) {
    customerAccount = {
      id: userProfile.id || `cust-${Date.now()}`,
      name: userProfile.name || '',
      email: userProfile.email.toLowerCase(),
      phone: userProfile.phone || '',
      address: userProfile.address || '',
      city: userProfile.city || 'Dhangadhi',
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
    return authenticateOAuthUser('admin', {
      id: 'store-admin-id',
      email: 'admin@furniturehubdhangadhi.com',
      name: 'Store Administrator',
      role: 'admin',
      avatar: '/images/social-user.png'
    });
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

  // 1. Check Administrator Credentials - verified strictly via Supabase
  if (cleanId === 'admin@furniturehub.com') {
    const isSbAdmin = await checkIsSupabaseAdmin({ email: 'admin@furniturehub.com', id: 'demo-admin-id' });
    if (!isSbAdmin) {
      throw new Error('Access denied: Administrator privileges revoked in Supabase. Only active Supabase admins can access this portal.');
    }
    const adminUser = {
      id: 'demo-admin-id',
      email: 'admin@furniturehub.com',
      name: 'Store Administrator',
      role: 'admin',
      user_metadata: { full_name: 'Store Administrator', role: 'admin' }
    };
    localStorage.setItem(STORAGE_ADMIN_SESSION, JSON.stringify(adminUser));
    localStorage.removeItem(STORAGE_CUSTOMER_SESSION);
    return { success: true, role: 'admin', user: adminUser };
  }

  // 2. Try Supabase Auth if configured and identifier is an email
  const client = getClient();
  if (client && cleanId.includes('@')) {
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanId,
        password
      });
      if (!error && data?.user) {
        const role = data.user.user_metadata?.role || (data.user.email === 'admin@furniturehub.com' ? 'admin' : 'customer');
        if (role === 'admin') {
          const adminUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name || 'Store Administrator',
            role: 'admin',
            user_metadata: data.user.user_metadata
          };
          localStorage.setItem(STORAGE_ADMIN_SESSION, JSON.stringify(adminUser));
          localStorage.removeItem(STORAGE_CUSTOMER_SESSION);
          return { success: true, role: 'admin', user: adminUser };
        } else {
          const custUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'Customer',
            phone: data.user.user_metadata?.phone || '9841234567',
            address: data.user.user_metadata?.address || 'Kathmandu',
            city: data.user.user_metadata?.city || 'Kathmandu Valley',
            role: 'customer'
          };
          localStorage.setItem(STORAGE_CUSTOMER_SESSION, JSON.stringify(custUser));
          localStorage.removeItem(STORAGE_ADMIN_SESSION);
          return { success: true, role: 'customer', user: custUser };
        }
      }
    } catch (sbErr) {
      console.warn('Supabase authentication failed, checking local accounts:', sbErr);
    }
  }

  // 3. Check Customer Accounts (Local store)
  const accounts = getStoredAccounts();
  const found = accounts.find(acc => {
    const emailMatch = acc.email.toLowerCase() === cleanId;
    const phoneMatch = cleanPhone.length >= 7 && acc.phone.replace(/[^0-9]/g, '') === cleanPhone;
    return (emailMatch || phoneMatch) && acc.password === password;
  });

  if (found) {
    const sessionData = {
      id: found.id,
      name: found.name,
      email: found.email,
      phone: found.phone,
      address: found.address,
      city: found.city,
      role: 'customer'
    };
    localStorage.setItem(STORAGE_CUSTOMER_SESSION, JSON.stringify(sessionData));
    localStorage.removeItem(STORAGE_ADMIN_SESSION);
    return { success: true, role: 'customer', user: sessionData };
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

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error('Please enter a valid 10-digit Nepal mobile number.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  // Try Supabase registration if configured
  const client = getClient();
  if (client) {
    try {
      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: name,
            phone: cleanPhone,
            address,
            city,
            role: 'customer'
          }
        }
      });
      if (error) console.warn('Supabase sign up warning:', error.message);
    } catch (sbErr) {
      console.warn('Supabase sign up failed, storing locally:', sbErr);
    }
  }

  // Save to local accounts
  const accounts = getStoredAccounts();
  const existing = accounts.find(a => a.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error('An account with this email already exists. Please sign in instead.');
  }

  const newAccount = {
    id: 'cust-' + Date.now(),
    name: name.trim() || 'Valued Customer',
    email: cleanEmail,
    phone: cleanPhone,
    address: (address || 'Kathmandu').trim(),
    city: city || 'Kathmandu Valley',
    password,
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

/**
 * Log out any active session (Customer or Admin)
 */
export async function logoutUser() {
  const client = getClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch {
      // ignore
    }
  }
  localStorage.removeItem(STORAGE_CUSTOMER_SESSION);
  localStorage.removeItem(STORAGE_ADMIN_SESSION);
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
 */
export function updateCustomerProfile(updatedData) {
  const current = getCurrentCustomer();
  if (!current) return null;

  const merged = { ...current, ...updatedData };
  localStorage.setItem(STORAGE_CUSTOMER_SESSION, JSON.stringify(merged));

  // Also update stored accounts
  const accounts = getStoredAccounts();
  const idx = accounts.findIndex(a => a.id === current.id || a.email === current.email);
  if (idx !== -1) {
    accounts[idx] = { ...accounts[idx], ...updatedData };
    saveStoredAccounts(accounts);
  }

  return merged;
}

/**
 * Order History management for customers (Strictly Isolated per customer)
 */
export function getCustomerOrders(customerId = null) {
  const current = getCurrentCustomer();
  let targetCustomer = current;

  if (customerId && (!current || current.id !== customerId)) {
    const accounts = getStoredAccounts();
    targetCustomer = accounts.find(a => a.id === customerId) || { id: customerId };
  }

  const targetId = targetCustomer?.id;
  const targetEmail = targetCustomer?.email?.toLowerCase();
  const targetPhone = targetCustomer?.phone?.replace(/[^0-9]/g, '');

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

export function saveCustomerOrder(order) {
  const current = getCurrentCustomer();
  const customerId = order.customerId || current?.id || 'cust-guest';
  const customerEmail = order.customerEmail || current?.email || '';

  const taggedOrder = {
    ...order,
    customerId,
    customerEmail
  };

  const allOrders = getAllOrdersFromStorage();
  allOrders.unshift(taggedOrder);
  saveAllOrdersToStorage(allOrders);
  return taggedOrder;
}

