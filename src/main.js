import { injectSpeedInsights } from '@vercel/speed-insights';
import { inject as injectAnalytics } from '@vercel/analytics';
import productsData from './data/products.json';

// Initialize Vercel Speed Insights & Real-User Analytics telemetry
const speedInsights = injectSpeedInsights();
const analytics = injectAnalytics();
import { renderNavbar } from './components/navbar.js';
import { renderCartDrawer } from './components/cart-drawer.js';
import { renderUserProfileModal } from './components/user-profile-modal.js';
import { renderCustomerAuthModal } from './components/customer-auth-modal.js';
import { renderFloatingWhatsApp } from './components/floating-whatsapp.js';
import { renderHomeView } from './views/home-view.js';
import { renderShopView } from './views/shop-view.js';
import { renderProductDetailView } from './views/product-detail-view.js';
import { renderNotFoundView } from './views/not-found-view.js';
import { renderAboutView } from './views/about-view.js';
import { renderFaqView } from './views/faq-view.js';
import { renderTermsView } from './views/terms-view.js';
import { renderAdminLoginView } from './views/admin/admin-login-view.js';
import { renderAdminLayout } from './views/admin/admin-layout.js';
import { renderAdminOverviewView } from './views/admin/admin-overview-view.js';
import { renderAdminProductsView } from './views/admin/admin-products-view.js';
import { renderAdminOrdersView } from './views/admin/admin-orders-view.js';
import { renderAdminSettingsView } from './views/admin/admin-settings-view.js';
import { renderCustomerDashboardView } from './views/customer/customer-dashboard-view.js';
import { renderOnboardingView } from './views/customer/customer-onboarding-view.js';
import { renderTrackOrderView } from './views/track/track-order-view.js';
import { openPostLoginOnboardingModal } from './components/post-login-onboarding-modal.js';
import { getBrandLoaderHtml, showGlobalBrandLoader, hideGlobalBrandLoader } from './components/brand-loader.js';
import { getCurrentUser, createOrder, fetchProducts, loginWithOAuth, checkIsSupabaseAdmin, syncSupabaseAdminsCache, getClient } from './services/supabase.js';
import { generateWhatsAppLink } from './services/whatsapp.js';
import { 
  getCurrentCustomer, 
  authenticateUser,
  authenticateOAuthUser,
  authenticateAuthorizedPerson,
  isCurrentAdmin,
  verifyAdminSession,
  customerLogin, 
  customerRegister, 
  customerLogout, 
  logoutUser,
  updateCustomerProfile, 
  saveCustomerOrder 
} from './services/customer-auth.js';
import { safeGetJson, safeSetJson } from './utils/security.js';

// Global Application State
const initialCustomer = getCurrentCustomer();
const state = {
  products: Array.isArray(productsData) ? productsData : [],
  cart: initialCustomer ? (safeGetJson('fh_cart_' + initialCustomer.id, null) || safeGetJson('fh_cart', [])) : [],
  wishlist: safeGetJson('fh_wishlist', []),
  customerUser: initialCustomer,
  customerProfile: safeGetJson('fh_customer_profile', {
    name: '',
    phone: '',
    address: '',
    city: 'Dhangadhi'
  }),
  isProfileOpen: false,
  isCustomerAuthOpen: false,
  customerAuthTab: 'login',
  isCartOpen: false,
  isCheckoutOpen: false,
  isReceiptOpen: false,
  lastOrder: null,
  couponCode: '',
  couponApplied: false,
  searchQuery: ''
};

// Event Bus
class EventBus {
  constructor() {
    this.events = {};
  }
  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
  }
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(fn => fn(data));
    }
  }
}

const events = new EventBus();

function saveState() {
  if (state.customerUser) {
    safeSetJson('fh_cart_' + state.customerUser.id, state.cart);
    safeSetJson('fh_cart', state.cart);
  } else {
    try { localStorage.removeItem('fh_cart'); } catch {}
  }
  safeSetJson('fh_wishlist', state.wishlist);
}

// Toast Notification
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${type === 'success' 
        ? '<polyline points="20 6 9 17 4 12"></polyline>' 
        : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Event Listeners
events.on('toast', ({ message, type }) => {
  showToast(message, type);
});

events.on('add-to-cart', ({ product, quantity = 1, color = '' }) => {
  if (!state.customerUser && !isCurrentAdmin()) {
    showToast('🔒 Please sign in to shop and add items to your cart.', 'danger');
    state.customerAuthTab = 'login';
    state.isCustomerAuthOpen = true;
    updateChrome();
    return;
  }
  const existing = state.cart.find(item => item.product.id === product.id && item.color === color);
  if (existing) {
    existing.quantity += quantity;
  } else {
    state.cart.push({ product, quantity, color });
  }
  saveState();
  state.isCartOpen = true;
  updateChrome();
  showToast(`Added ${quantity}x "${product.name}" to cart!`);
});

events.on('remove-from-cart', (productId) => {
  state.cart = state.cart.filter(item => item.product.id !== productId);
  saveState();
  updateChrome();
  showToast('Item removed from cart');
});

events.on('update-cart-qty', ({ id, delta }) => {
  const item = state.cart.find(i => i.product.id === id);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      state.cart = state.cart.filter(i => i.product.id !== id);
    }
  }
  saveState();
  updateChrome();
});

events.on('toggle-wishlist', (productId) => {
  const idx = state.wishlist.indexOf(productId);
  const p = state.products.find(item => item.id === productId);
  if (idx >= 0) {
    state.wishlist.splice(idx, 1);
    showToast(`Removed "${p?.name || 'Item'}" from wishlist`);
  } else {
    state.wishlist.push(productId);
    showToast(`Added "${p?.name || 'Item'}" to wishlist!`);
  }
  saveState();
  updateChrome();
  renderCurrentView();
});

events.on('apply-coupon', (code) => {
  state.couponCode = code;
  state.couponApplied = true;
  updateChrome();
  showToast('🎉 Coupon HUB10 applied! 10% discount added.');
});

events.on('open-cart', () => {
  if (!state.customerUser && !isCurrentAdmin()) {
    showToast('🔒 Please sign in to access your shopping cart and shop.', 'danger');
    state.customerAuthTab = 'login';
    state.isCustomerAuthOpen = true;
    updateChrome();
    return;
  }
  state.isCartOpen = true;
  updateChrome();
});

events.on('close-cart', () => {
  state.isCartOpen = false;
  updateChrome();
});

events.on('open-checkout', () => {
  if (!state.customerUser) {
    showToast('🔒 Please sign in or register to place your order via WhatsApp.', 'danger');
    state.customerAuthTab = 'login';
    state.isCustomerAuthOpen = true;
    updateChrome();
    return;
  }
  state.isCheckoutOpen = true;
  updateChrome();
});

events.on('close-checkout', () => {
  state.isCheckoutOpen = false;
  updateChrome();
});

let isPlacingOrder = false;

events.on('order-placed', async (orderData = {}) => {
  // Prevent duplicate placement while in flight
  if (isPlacingOrder) return;

  if (!state.customerUser) {
    showToast('🔒 Please sign in to complete your order.', 'danger');
    state.customerAuthTab = 'login';
    state.isCustomerAuthOpen = true;
    updateChrome();
    return;
  }

  // Live checkout session verification: Check live Supabase session
  const client = getClient();
  if (client) {
    try {
      const { data: sessionData, error: sessionErr } = await client.auth.getSession();
      const activeSession = sessionData?.session;
      if (sessionErr || !activeSession || !activeSession.user) {
        // Local customer exists without a Supabase session: clear local session and state.customerUser, open customer-auth-modal, and stop.
        localStorage.removeItem('fh_customer_session');
        state.customerUser = null;
        showToast('🔒 Your session has expired. Please sign in to verify your account and place your order.', 'danger');
        state.customerAuthTab = 'login';
        state.isCustomerAuthOpen = true;
        updateChrome();
        return;
      }
    } catch (sessionCheckErr) {
      console.warn('Session verification check failed:', sessionCheckErr);
    }
  }

  // Lock placement in flight and disable submit button
  isPlacingOrder = true;
  const submitBtn = document.querySelector('#checkout-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
    submitBtn.style.pointerEvents = 'none';
  }

  const customer = state.customerUser;
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const orderRef = 'FH-' + dateStr + '-' + Math.floor(100000 + Math.random() * 900000);
  const orderItems = [...state.cart];
  const orderTotal = orderData.total || 15000;

  const orderPayload = {
    id: orderRef,
    reference: orderRef,
    customerId: customer.id,
    customerEmail: customer.email,
    items: orderItems,
    total: orderTotal,
    name: orderData.name || customer.name,
    phone: orderData.phone || customer.phone,
    address: orderData.address || customer.address || 'Kathmandu Valley',
    paymentMethod: orderData.paymentMethod || 'WhatsApp Direct',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    created_at: new Date().toISOString()
  };

  // 1. Order Creation via Authoritative RPC
  let createdOrder = null;
  try {
    showGlobalBrandLoader('Finalizing order & preparing WhatsApp receipt...');
    createdOrder = await createOrder({
      id: orderPayload.id,
      customer_name: orderPayload.name,
      customer_email: orderPayload.customerEmail,
      customer_phone: orderPayload.phone,
      delivery_address: orderPayload.address,
      items: orderPayload.items,
      total_amount: orderPayload.total,
      payment_method: orderPayload.paymentMethod,
      coupon_code: orderData.couponCode || (state.couponApplied ? (state.couponCode || 'HUB10') : null),
      status: 'Pending',
      created_at: orderPayload.created_at
    });
  } catch (err) {
    // Keep order-creation failure separate: re-enable button and inform customer
    console.error('Error recording order to database:', err);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.pointerEvents = 'auto';
    }
    isPlacingOrder = false;
    hideGlobalBrandLoader();
    showToast(`❌ Failed to place order: ${err.message || 'Please check your connection and try again.'}`, 'danger');
    return;
  }

  // 2. Post-Persistence Processing: use canonical returned order throughout customer flow
  try {
    const previewTotal = orderPayload.total;
    const canonicalTotal = createdOrder.total != null 
      ? Number(createdOrder.total) 
      : (createdOrder.total_amount != null ? Number(createdOrder.total_amount) : previewTotal);

    if (canonicalTotal !== previewTotal) {
      showToast(`Order total updated to Rs. ${canonicalTotal.toLocaleString()}/- (store delivery & promotional calculation applied)`, 'info');
    }

    const canonicalOrder = {
      ...orderPayload,
      ...createdOrder,
      total: canonicalTotal,
      total_amount: canonicalTotal
    };

    // Generate WhatsApp link using canonical order and canonical items, preserving ME-6 ceiling
    const wa = generateWhatsAppLink(canonicalOrder, canonicalOrder.items || orderItems, {
      recipient_name: canonicalOrder.name,
      phone: canonicalOrder.phone,
      address_line1: canonicalOrder.address
    });
    canonicalOrder.whatsappUrl = wa.url;

    state.lastOrder = canonicalOrder;
    state.isCheckoutOpen = false;
    state.isReceiptOpen = true;
    state.cart = [];
    saveState();
    saveCustomerOrder(canonicalOrder);
    updateChrome();
    showToast(`🎊 Order #${canonicalOrder.reference || canonicalOrder.id} placed successfully!`, 'success');

    // Attempt auto-opening WhatsApp notification window if allowed by browser
    try {
      if (canonicalOrder.whatsappUrl) {
        window.open(canonicalOrder.whatsappUrl, '_blank');
      }
    } catch (popupErr) {
      // Popup blockers handled gracefully by receipt modal button
    }
  } catch (postErr) {
    // Keep order-creation failure separate from post-persistence errors; log later errors and show success with reference
    console.error('Post-persistence order processing error:', postErr);
    const ref = createdOrder?.reference || createdOrder?.id || orderRef;
    state.isCheckoutOpen = false;
    state.isReceiptOpen = true;
    state.cart = [];
    saveState();
    updateChrome();
    showToast(`🎊 Order #${ref} placed successfully!`, 'success');
  } finally {
    isPlacingOrder = false;
    hideGlobalBrandLoader();
  }
});

events.on('close-receipt', () => {
  state.isReceiptOpen = false;
  updateChrome();
});

// Customer Authentication Event Listeners
events.on('open-customer-auth', (tab = 'login') => {
  state.customerAuthTab = tab;
  state.isCustomerAuthOpen = true;
  updateChrome();
});

events.on('close-customer-auth', () => {
  state.isCustomerAuthOpen = false;
  updateChrome();
});

function applyAuthenticatedSession(res, welcomeMsg = null) {
  state.isCustomerAuthOpen = false;
  if (res.role === 'admin') {
    state.customerUser = null;
    updateChrome();
    showToast(welcomeMsg || 'Welcome back, Store Administrator!', 'success');
    window.location.hash = '#admin/overview';
    renderCurrentView();
  } else {
    state.customerUser = res.user;
    state.cart = safeGetJson('fh_cart_' + res.user.id, null) || safeGetJson('fh_cart', []);
    state.customerProfile = {
      name: res.user.name || '',
      phone: res.user.phone || '',
      address: res.user.address || '',
      city: res.user.city || 'Dhangadhi'
    };
    safeSetJson('fh_customer_profile', state.customerProfile);
    updateChrome();
    showToast(welcomeMsg || `Welcome, ${res.user.name || 'Valued Customer'}!`, 'success');

    // Consume any pending destination saved before the auth guard redirected
    const pendingTab = sessionStorage.getItem('fh_pending_tab');
    sessionStorage.removeItem('fh_pending_tab');

    // Persistent Onboarding: If customer hasn't provided mandatory delivery details, route to #onboarding
    const isMissingDetails = !res.user.phone || !res.user.address;
    if (isMissingDetails) {
      // Carry the pending tab through onboarding so it is restored afterwards
      if (pendingTab) sessionStorage.setItem('fh_pending_tab', pendingTab);
      window.location.hash = '#onboarding';
      renderCurrentView();
    } else {
      const needsRedirect =
        window.location.hash.includes('access_token=') ||
        window.location.hash.startsWith('#admin') ||
        window.location.hash === '#login' ||
        window.location.hash === '#account' ||
        window.location.hash === '#profile' ||
        window.location.hash === '#home' ||
        window.location.hash === '' ||
        window.location.hash === '#';
      if (needsRedirect) {
        window.location.hash = pendingTab
          ? `#customer/dashboard?tab=${pendingTab}`
          : '#customer/dashboard';
      }
      renderCurrentView();
    }
  }
}


// Google OAuth Login Handler (Real Google Sign-In Only)
events.on('oauth-login', async ({ provider = 'google' }) => {
  try {
    const authRes = await loginWithOAuth('google');
    if (authRes?.url) {
      window.location.href = authRes.url;
      return;
    }
    showToast('Error (Code: 502)', 'danger');
  } catch (err) {
    const msg = err?.message && err.message.startsWith('Error') ? err.message : `Error (Code: ${err?.status || 500})`;
    showToast(msg, 'danger');
  }
});

// Direct Customer Sign-in
events.on('oauth-direct-login', async ({ identifier }) => {
  try {
    const clean = (identifier || '').trim();
    if (!clean) {
      showToast('Please enter your email or mobile number.', 'danger');
      return;
    }
    const isEmail = clean.includes('@');
    const res = await authenticateOAuthUser('email', {
      id: `cust-${Date.now()}`,
      email: isEmail ? clean.toLowerCase() : `${clean.replace(/[^0-9]/g, '')}@customer.local`,
      name: isEmail ? clean.split('@')[0] : `Customer ${clean.slice(-4)}`,
      phone: !isEmail ? clean : '',
      role: 'customer'
    });
    applyAuthenticatedSession(res, `👋 Welcome, ${res.user.name}!`);
  } catch (err) {
    showToast(err.message || 'Sign in failed.', 'danger');
  }
});

// Unified User Authentication (Admin & Customer fallback)
events.on('user-login', async ({ identifier, password }) => {
  try {
    const res = await authenticateUser(identifier, password);
    applyAuthenticatedSession(res);
  } catch (err) {
    showToast(err.message || 'Login failed. Please verify credentials.', 'danger');
  }
});

events.on('open-customer-dashboard', () => {
  window.location.hash = '#customer/dashboard';
});

events.on('customer-login', async ({ identifier, password }) => {
  events.emit('user-login', { identifier, password });
});

events.on('customer-register', async (formData) => {
  try {
    const res = await customerRegister(formData);
    state.customerUser = res.customer;
    state.cart = [];
    state.customerProfile = {
      name: res.customer.name,
      phone: res.customer.phone,
      address: res.customer.address,
      city: res.customer.city
    };
    localStorage.setItem('fh_customer_profile', JSON.stringify(state.customerProfile));
    state.isCustomerAuthOpen = false;
    updateChrome();
    showToast(`🎉 Account created! Welcome, ${res.customer.name}!`, 'success');
  } catch (err) {
    showToast(err.message || 'Registration failed.', 'danger');
  }
});

events.on('customer-logout', async () => {
  await logoutUser();
  state.customerUser = null;
  state.cart = [];
  localStorage.removeItem('fh_cart');
  updateChrome();
  showToast('👋 You have been safely signed out.', 'success');
  if (window.location.hash.startsWith('#admin') || window.location.hash.startsWith('#customer')) {
    window.location.hash = '#home';
  } else {
    renderCurrentView();
  }
});

events.on('user-logout', async () => {
  events.emit('customer-logout');
});

// User Profile Event Listeners (User Side)
events.on('open-profile', () => {
  state.isProfileOpen = true;
  updateChrome();
});

events.on('close-profile', () => {
  state.isProfileOpen = false;
  updateChrome();
});

events.on('update-user-profile', async (data) => {
  try {
    if (state.customerUser) {
      state.customerUser = await updateCustomerProfile(data);
    }
    state.customerProfile = { ...state.customerProfile, ...data };
    localStorage.setItem('fh_customer_profile', JSON.stringify(state.customerProfile));
    updateChrome();
    showToast(`📱 Mobile number & contact profile updated (${state.customerProfile.phone})!`, 'success');
  } catch (err) {
    console.error('Failed to update profile:', err);
    showToast(`Failed to update profile: ${err.message}`, 'danger');
  }
});

// Update persistent components (Navbar, Cart Drawer, Customer Profile Modal, Customer Auth Modal, Floating WhatsApp)
function updateChrome() {
  const navContainer = document.getElementById('navbar-container');
  if (navContainer) {
    renderNavbar(navContainer, state, events);
  }

  const drawerContainer = document.getElementById('cart-drawer-container');
  if (drawerContainer) {
    renderCartDrawer(drawerContainer, state, events);
  }

  const profileContainer = document.getElementById('user-profile-container');
  if (profileContainer) {
    renderUserProfileModal(profileContainer, state, events);
  }

  const authContainer = document.getElementById('customer-auth-container');
  if (authContainer) {
    renderCustomerAuthModal(authContainer, state, events);
  }

  const floatingContainer = document.getElementById('floating-whatsapp-container');
  if (floatingContainer) {
    renderFloatingWhatsApp(floatingContainer, state, events);
  }
}

// Route resolution supporting both pathname and hash routes
function resolveRoute() {
  const hash = window.location.hash || '';
  const [rawHashRoute, hashQuery] = hash.split('?');
  const rawPathname = window.location.pathname || '/';
  const pathname = rawPathname.replace(/\/+$/, '') || '/';

  // Merge query parameters from pathname search (?...) and hash query (?...)
  const params = new URLSearchParams(window.location.search || '');
  if (hashQuery) {
    const hp = new URLSearchParams(hashQuery);
    hp.forEach((val, key) => params.set(key, val));
  }

  // 1. If explicit hash route is provided (e.g. #shop, #admin/orders)
  if (rawHashRoute && rawHashRoute !== '#' && rawHashRoute !== '') {
    // If navigating via hash while on an unknown path or subpath, clean the pathname to '/'
    if (pathname !== '/' && pathname !== '/index.html') {
      try {
        window.history.replaceState(null, '', '/' + hash);
      } catch (_) {}
    }
    return { route: rawHashRoute, params };
  }

  // 2. No hash route provided: evaluate pathname
  if (pathname === '/' || pathname === '/index.html' || pathname === '/home') {
    return { route: '#home', params };
  }
  if (pathname === '/shop') {
    return { route: '#shop', params };
  }
  if (pathname === '/track' || pathname === '/track-order' || pathname === '/order-tracking') {
    return { route: '#track', params };
  }
  if (pathname === '/product-detail') {
    return { route: '#product-detail', params };
  }
  if (pathname === '/about') {
    return { route: '#about', params };
  }
  if (pathname === '/faq' || pathname === '/faqs') {
    return { route: '#faq', params };
  }
  if (pathname === '/terms' || pathname === '/terms-and-conditions') {
    return { route: '#terms', params };
  }
  if (pathname === '/privacy' || pathname === '/privacy-policy') {
    return { route: '#privacy', params };
  }
  if (pathname === '/onboarding' || pathname === '/complete-profile') {
    return { route: '#onboarding', params };
  }
  if (pathname === '/customer' || pathname === '/customer/dashboard' || pathname === '/customer-dashboard' || pathname === '/account' || pathname === '/dashboard') {
    return { route: '#customer/dashboard', params };
  }
  if (pathname === '/profile') {
    return { route: '#profile', params };
  }
  if (pathname === '/login') {
    return { route: '#login', params };
  }
  if (pathname === '/register') {
    return { route: '#register', params };
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return { route: '#' + pathname.replace(/^\/+/, ''), params };
  }
  if (pathname === '/404' || pathname === '/notfound' || pathname === '/not-found') {
    return { route: '#404', params };
  }

  // Any unrecognized path (e.g. /sfaskdkasjjfasjfhjvjaksfjhvjbsj) routes to 404
  return { route: '#404', params };
}

function updatePageMeta(route, params) {
  let title = 'Furniture Hub Dhangadhi | #1 Furniture Store in Dhangadhi | फर्निचर हब';
  let isNotFound = false;

  if (route === '#shop') {
    title = 'Shop Furniture Collection | Furniture Hub Dhangadhi';
  } else if (route === '#track' || route === '#track-order' || route === '#order-tracking') {
    title = 'Track Your Order | Furniture Hub Dhangadhi';
  } else if (route === '#product-detail') {
    const pid = params?.get('id');
    const p = pid && Array.isArray(state.products) ? state.products.find(x => x.id === pid) : null;
    title = p ? `${p.name} | Furniture Hub Dhangadhi` : 'Product Details | Furniture Hub Dhangadhi';
  } else if (route === '#about') {
    title = 'About Us | Furniture Hub Dhangadhi';
  } else if (route === '#faq' || route === '#faqs') {
    title = 'Frequently Asked Questions | Furniture Hub Dhangadhi';
  } else if (route === '#terms') {
    title = 'Terms & Conditions | Furniture Hub Dhangadhi';
  } else if (route === '#privacy') {
    title = 'Privacy Policy | Furniture Hub Dhangadhi';
  } else if (route === '#admin' || route.startsWith('#admin/')) {
    title = 'Admin Workspace | Furniture Hub Dhangadhi';
  } else if (route === '#onboarding' || route === '#complete-profile') {
    title = 'Complete Profile | Furniture Hub Dhangadhi';
  } else if (route === '#customer/dashboard' || route === '#profile' || route === '#customer-dashboard' || route === '#account' || route === '#dashboard') {
    title = 'Customer Dashboard | Furniture Hub Dhangadhi';
  } else if (route === '#404' || route === '#notfound' || route === '#not-found') {
    title = 'Page Not Found (404) | Furniture Hub Dhangadhi';
    isNotFound = true;
  } else if (route === '#home' || route === '' || route === '#') {
    title = 'Furniture Hub Dhangadhi | #1 Furniture Store in Dhangadhi | फर्निचर हब';
  } else {
    title = 'Page Not Found (404) | Furniture Hub Dhangadhi';
    isNotFound = true;
  }

  document.title = title;

  // Manage robots meta tag to avoid indexing 404 pages
  let robotsMeta = document.querySelector('meta[name="robots"]');
  if (isNotFound) {
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.content = 'noindex, nofollow';
  } else if (robotsMeta) {
    robotsMeta.content = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  }
}

// Router & View Rendering
async function renderCurrentView() {
  const appContainer = document.getElementById('app-view');
  const navContainer = document.getElementById('navbar-container');
  const drawerContainer = document.getElementById('cart-drawer-container');
  const profileContainer = document.getElementById('user-profile-container');
  const authContainer = document.getElementById('customer-auth-container');
  const floatingWaContainer = document.getElementById('floating-whatsapp-container');
  if (!appContainer) return;

  // If the URL contains an OAuth token, wait for Supabase to finish session processing
  if (window.location.hash.includes('access_token=') || window.location.hash.includes('refresh_token=')) {
    return;
  }

  const { route, params } = resolveRoute();
  updatePageMeta(route, params);

  window.scrollTo({ top: 0, behavior: 'instant' });

  // Admin Portal Routes with Strict Role Guard
  if (route === '#admin' || route.startsWith('#admin/')) {
    // Single Unified Portal redirection: #admin/login routes to unified portal
    if (route === '#admin/login') {
      state.customerAuthTab = 'login';
      state.isCustomerAuthOpen = true;
      updateChrome();
      window.location.hash = '#home';
      return;
    }

    // Strict Role-Based Security: Verify administrator privileges asynchronously against Supabase server
    let hasAdminAccess = isCurrentAdmin();
    if (!hasAdminAccess) {
      hasAdminAccess = await verifyAdminSession();
    }

    if (!hasAdminAccess) {
      if (state.customerUser) {
        showToast('⛔ Access Denied: Administrator privileges required.', 'danger');
      } else {
        showToast('Please sign in with administrator credentials.', 'info');
        state.customerAuthTab = 'login';
        state.isCustomerAuthOpen = true;
      }
      updateChrome();
      window.location.hash = '#home';
      return;
    }

    // Hide storefront chrome for clean admin workspace
    if (navContainer) navContainer.style.display = 'none';
    if (drawerContainer) drawerContainer.style.display = 'none';
    if (profileContainer) profileContainer.style.display = 'none';
    if (authContainer) authContainer.style.display = 'none';
    if (floatingWaContainer) floatingWaContainer.style.display = 'none';

    if (route === '#admin' || route === '#admin/') {
      window.location.hash = '#admin/overview';
      return;
    }

    const subView = route.replace('#admin/', '') || 'overview';

    await renderAdminLayout(appContainer, state, events, subView, async (slot) => {
      if (subView === 'products') {
        await renderAdminProductsView(slot, state, events);
      } else if (subView === 'orders') {
        await renderAdminOrdersView(slot, state, events);
      } else if (subView === 'settings') {
        await renderAdminSettingsView(slot, state, events);
      } else {
        await renderAdminOverviewView(slot, state, events);
      }
    });
    return;
  }

  // Public Consumer Store Routes
  if (navContainer) navContainer.style.display = '';
  if (drawerContainer) drawerContainer.style.display = '';
  if (profileContainer) profileContainer.style.display = '';
  if (authContainer) authContainer.style.display = '';
  if (floatingWaContainer) floatingWaContainer.style.display = '';

  if (route === '#login') {
    state.customerAuthTab = 'login';
    state.isCustomerAuthOpen = true;
    updateChrome();
    window.location.hash = '#home';
    return;
  }

  if (route === '#register') {
    state.customerAuthTab = 'register';
    state.isCustomerAuthOpen = true;
    updateChrome();
    window.location.hash = '#home';
    return;
  }

  // Customer Onboarding / Details Setup Route (#onboarding, #complete-profile)
  if (route === '#onboarding' || route === '#complete-profile') {
    if (isCurrentAdmin()) {
      window.location.hash = '#admin/overview';
      return;
    }
    if (!state.customerUser) {
      showToast('Please sign in to complete your delivery details.', 'info');
      state.customerAuthTab = 'login';
      state.isCustomerAuthOpen = true;
      updateChrome();
      window.location.hash = '#home';
      return;
    }
    // If user already has contact and address details filled, route to dashboard
    if (state.customerUser.phone && state.customerUser.address) {
      window.location.hash = '#customer/dashboard';
      return;
    }
    updateChrome();
    renderOnboardingView(appContainer, state, events);
    return;
  }

  // Customer Dashboard Routes (Strict Customer Isolation)
  if (route === '#customer/dashboard' || route === '#customer-dashboard' || route === '#account' || route === '#profile' || route === '#dashboard') {
    if (isCurrentAdmin()) {
      window.location.hash = '#admin/overview';
      return;
    }
    if (!state.customerUser) {
      // Persist the intended tab so it survives the redirect to #home and login flow
      const intendedTab = route === '#profile'
        ? 'profile'
        : (['orders', 'profile', 'wishlist'].includes(params.get('tab')) ? params.get('tab') : null);
      if (intendedTab) {
        sessionStorage.setItem('fh_pending_tab', intendedTab);
      } else {
        // Clear any stale pending tab so a plain #customer/dashboard request
        // is not hijacked by a previously saved value (e.g. wishlist)
        sessionStorage.removeItem('fh_pending_tab');
      }

      showToast('Please sign in to access your customer dashboard.', 'danger');
      state.customerAuthTab = 'login';
      state.isCustomerAuthOpen = true;
      updateChrome();
      window.location.hash = '#home';
      return;
    }
    // If customer is missing phone or delivery address, redirect to onboarding page
    if (!state.customerUser.phone || !state.customerUser.address) {
      // Preserve a valid tab request so onboarding redirects back to it afterwards
      const tabBeforeOnboard = ['orders', 'profile', 'wishlist'].includes(params.get('tab')) ? params.get('tab') : null;
      if (tabBeforeOnboard) {
        sessionStorage.setItem('fh_pending_tab', tabBeforeOnboard);
      } else {
        sessionStorage.removeItem('fh_pending_tab');
      }
      window.location.hash = '#onboarding';
      return;
    }
    updateChrome();
    // Whitelist tab parameter to prevent unknown-pane rendering
    const requestedTab = params.get('tab');
    const activeTab = ['orders', 'profile', 'wishlist'].includes(requestedTab)
      ? requestedTab
      : (route === '#profile' ? 'profile' : 'orders');
    await renderCustomerDashboardView(appContainer, state, events, activeTab);
    return;
  }

  updateChrome();

  if (route === '#shop') {
    renderShopView(appContainer, state, events, params);
  } else if (route === '#track' || route === '#track-order' || route === '#order-tracking') {
    renderTrackOrderView(appContainer, state, events, params);
  } else if (route === '#product-detail') {
    renderProductDetailView(appContainer, state, events, params);
  } else if (route === '#about') {
    renderAboutView(appContainer, state, events);
  } else if (route === '#faq' || route === '#faqs') {
    renderFaqView(appContainer, state, events);
  } else if (route === '#terms' || route === '#privacy') {
    renderTermsView(appContainer, state, events);
  } else if (route === '#404' || route === '#notfound' || route === '#not-found') {
    renderNotFoundView(appContainer, state, events);
  } else if (route === '#home' || route === '' || route === '#') {
    renderHomeView(appContainer, state, events);
  } else {
    // Unmatched routes / broken links render the 404 page
    renderNotFoundView(appContainer, state, events);
  }
}

// Initialization
window.addEventListener('DOMContentLoaded', async () => {
  // Sanitize double hash if redirect URL had a route like #admin#access_token=
  if (window.location.hash.includes('access_token=')) {
    const tokenIndex = window.location.hash.indexOf('access_token=');
    if (tokenIndex > 1) {
      const cleanFragment = '#' + window.location.hash.substring(tokenIndex);
      window.history.replaceState(null, '', window.location.pathname + cleanFragment);
    }
  }

  try {
    const dbProducts = await fetchProducts();
    state.products = Array.isArray(dbProducts) ? dbProducts : [];
  } catch (err) {
    console.warn('Product database fetch error:', err);
    state.products = [];
  }

  // Sync verified Supabase cloud store_admins into local cache
  try {
    await syncSupabaseAdminsCache();
  } catch (e) {
    console.warn('Admin cache sync notice:', e);
  }

  // Server-Verified Admin Auto-Promotion: Only promotes if backed by a valid Supabase token
  const client = getClient();
  if (client) {
    try {
      const { data: { user } } = await client.auth.getUser();
      if (user) {
        const isSb = await checkIsSupabaseAdmin(user);
        if (isSb && !isCurrentAdmin()) {
          const adminSession = {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || 'Store Administrator',
            role: 'admin',
            avatar: user.user_metadata?.avatar_url || '/images/social-user.png',
            provider: user.app_metadata?.provider || 'google'
          };
          localStorage.setItem('fh_demo_admin_user', JSON.stringify(adminSession));
          localStorage.removeItem('fh_customer_session');
          state.customerUser = null;
        }
      }
    } catch (e) {
      console.warn('Server session verification notice:', e);
    }
  }

  // Handle real Supabase Google OAuth callback session
  if (client) {
    try {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        const u = session.user;
        const isSb = await checkIsSupabaseAdmin(u);
        if (isSb && !isCurrentAdmin()) {
          const res = await authenticateOAuthUser('google', {
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email.split('@')[0],
            avatar: u.user_metadata?.avatar_url || '/images/social-user.png'
          });
          applyAuthenticatedSession(res, 'Welcome back, Store Administrator!');
        } else if (!state.customerUser && !isCurrentAdmin()) {
          const res = await authenticateOAuthUser('google', {
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email.split('@')[0],
            avatar: u.user_metadata?.avatar_url || '/images/social-user.png'
          });
          applyAuthenticatedSession(res, 'Signed in successfully with Google.');
        }
      }

      client.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          const u = session.user;
          const isSb = await checkIsSupabaseAdmin(u);
          if (isSb && !isCurrentAdmin()) {
            const res = await authenticateOAuthUser('google', {
              id: u.id,
              email: u.email,
              name: u.user_metadata?.full_name || u.user_metadata?.name || u.email.split('@')[0],
              avatar: u.user_metadata?.avatar_url || '/images/social-user.png'
            });
            applyAuthenticatedSession(res, 'Welcome back, Store Administrator!');
          } else if (!isCurrentAdmin()) {
            const sbEmail = (u.email || '').toLowerCase().trim();
            const sessionMatchesSbUser =
              state.customerUser &&
              (state.customerUser.id === u.id ||
                (state.customerUser.email || '').toLowerCase().trim() === sbEmail);

            if (!state.customerUser || !sessionMatchesSbUser) {
              // No session, or existing session belongs to a different user — authenticate properly
              const res = await authenticateOAuthUser('google', {
                id: u.id,
                email: u.email,
                name: u.user_metadata?.full_name || u.user_metadata?.name || u.email.split('@')[0],
                avatar: u.user_metadata?.avatar_url || '/images/social-user.png'
              });
              applyAuthenticatedSession(res, 'Signed in successfully with Google.');
            } else {
              // Session already confirmed to belong to this Supabase user — just render
              renderCurrentView();
            }
          }
        } else if (event === 'SIGNED_OUT') {
          // User is already signed out in Supabase.
          // Do NOT call client.auth.signOut() or logoutUser() here to avoid recursive infinite loop!
          state.customerUser = null;
          state.cart = [];
          localStorage.removeItem('fh_customer_session');
          localStorage.removeItem('fh_demo_admin_user');
          localStorage.removeItem('fh_cart');
          sessionStorage.removeItem('fh_pending_tab');
          updateChrome();
          if (window.location.hash.startsWith('#admin') || window.location.hash.startsWith('#customer') || window.location.hash === '#onboarding') {
            window.location.hash = '#home';
          } else {
            renderCurrentView();
          }
        }
      });
    } catch (e) {
      console.warn('Supabase OAuth session check error:', e);
    }
  }

  updateChrome();
  await renderCurrentView();

  // Dismiss initial branded circular preloader
  const preloader = document.getElementById('fh-initial-preloader');
  if (preloader) {
    preloader.classList.add('fh-preloader-fadeout');
    setTimeout(() => {
      preloader.remove();
    }, 450);
  }
});

events.on('show-brand-loader', (data) => {
  showGlobalBrandLoader(data?.text || 'Loading Furniture Hub...');
});

events.on('hide-brand-loader', () => {
  hideGlobalBrandLoader();
});

events.on('products-updated', (updatedList) => {
  if (Array.isArray(updatedList)) {
    state.products = updatedList;
    renderCurrentView();
  }
});

window.addEventListener('hashchange', () => {
  if (speedInsights?.setRoute) {
    speedInsights.setRoute(window.location.hash || window.location.pathname || '#home');
  }
  renderCurrentView();
});

window.addEventListener('popstate', () => {
  renderCurrentView();
});

// Global Newsletter Handler
document.addEventListener('submit', (e) => {
  if (e.target && e.target.id === 'figma-global-newsletter-form') {
    e.preventDefault();
    const input = e.target.querySelector('input[type="email"]');
    const email = input ? input.value : '';
    if (email) {
      events.emit('toast', { 
        message: `Thank you for subscribing, ${email}!.`, 
        type: 'success' 
      });
      e.target.reset();
    }
  }
});

