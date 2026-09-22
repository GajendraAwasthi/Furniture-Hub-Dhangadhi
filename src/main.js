import { injectSpeedInsights } from '@vercel/speed-insights';
import productsData from './data/products.json';

// Initialize Vercel Speed Insights for real-user Core Web Vitals telemetry
const speedInsights = injectSpeedInsights();
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
import { openPostLoginOnboardingModal } from './components/post-login-onboarding-modal.js';
import { getCurrentUser, createOrder, fetchProducts, loginWithOAuth, checkIsSupabaseAdmin, getClient } from './services/supabase.js';
import { generateWhatsAppLink } from './services/whatsapp.js';
import { 
  getCurrentCustomer, 
  authenticateUser,
  authenticateOAuthUser,
  authenticateAuthorizedPerson,
  isCurrentAdmin,
  customerLogin, 
  customerRegister, 
  customerLogout, 
  logoutUser,
  updateCustomerProfile, 
  saveCustomerOrder 
} from './services/customer-auth.js';

// Global Application State
const initialCustomer = getCurrentCustomer();
const state = {
  products: Array.isArray(productsData) ? productsData : [],
  cart: initialCustomer ? (JSON.parse(localStorage.getItem('fh_cart_' + initialCustomer.id)) || JSON.parse(localStorage.getItem('fh_cart')) || []) : [],
  wishlist: JSON.parse(localStorage.getItem('fh_wishlist')) || [],
  customerUser: initialCustomer,
  customerProfile: JSON.parse(localStorage.getItem('fh_customer_profile')) || {
    name: '',
    phone: '',
    address: '',
    city: 'Dhangadhi'
  },
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
    localStorage.setItem('fh_cart_' + state.customerUser.id, JSON.stringify(state.cart));
    localStorage.setItem('fh_cart', JSON.stringify(state.cart));
  } else {
    localStorage.removeItem('fh_cart');
  }
  localStorage.setItem('fh_wishlist', JSON.stringify(state.wishlist));
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

events.on('order-placed', async (orderData = {}) => {
  if (!state.customerUser) {
    showToast('🔒 Please sign in to complete your order.', 'danger');
    state.customerAuthTab = 'login';
    state.isCustomerAuthOpen = true;
    updateChrome();
    return;
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

  // Generate verified WhatsApp deep-link adhering strictly to 1800 character ceiling
  const wa = generateWhatsAppLink(orderPayload, orderItems, {
    recipient_name: orderPayload.name,
    phone: orderPayload.phone,
    address_line1: orderPayload.address
  });
  orderPayload.whatsappUrl = wa.url;

  state.isCheckoutOpen = false;
  state.isReceiptOpen = true;
  state.lastOrder = orderPayload;
  state.cart = [];
  saveState();
  saveCustomerOrder(orderPayload);
  updateChrome();
  showToast(`🎊 Order #${orderRef} placed successfully!`, 'success');

  // Attempt auto-opening WhatsApp notification window if allowed by browser
  try {
    if (orderPayload.whatsappUrl) {
      window.open(orderPayload.whatsappUrl, '_blank');
    }
  } catch (popupErr) {
    // Popup blockers handled gracefully by receipt modal button
  }

  // Push order directly into Supabase / local database first (source of truth)
  try {
    await createOrder({
      id: orderPayload.id,
      customer_name: orderPayload.name,
      customer_phone: orderPayload.phone,
      delivery_address: orderPayload.address,
      items: orderPayload.items,
      total_amount: orderPayload.total,
      payment_method: orderPayload.paymentMethod,
      status: 'PLACED',
      created_at: orderPayload.created_at
    });
  } catch (err) {
    console.error('Error recording order to database:', err);
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
    showToast(welcomeMsg || '🛡️ Welcome back, Store Administrator!', 'success');
    window.location.hash = '#admin/overview';
    renderCurrentView();
  } else {
    state.customerUser = res.user;
    state.cart = JSON.parse(localStorage.getItem('fh_cart_' + res.user.id)) || JSON.parse(localStorage.getItem('fh_cart')) || [];
    state.customerProfile = {
      name: res.user.name || '',
      phone: res.user.phone || '',
      address: res.user.address || '',
      city: res.user.city || 'Dhangadhi'
    };
    localStorage.setItem('fh_customer_profile', JSON.stringify(state.customerProfile));
    updateChrome();
    showToast(welcomeMsg || `Welcome, ${res.user.name || 'Valued Customer'}!`, 'success');

    // Post-Login Mandatory Location and Mobile Number Dialog
    const isMissingDetails = !res.user.phone || !res.user.address;
    if (isMissingDetails) {
      openPostLoginOnboardingModal(res.user, (details) => {
        updateCustomerProfile(res.user.id, details);
        state.customerUser = { ...state.customerUser, ...details };
        state.customerProfile = { ...state.customerProfile, ...details };
        localStorage.setItem('fh_customer_profile', JSON.stringify(state.customerProfile));
        updateChrome();
        showToast('Delivery details saved! Welcome to Furniture Hub Dhangadhi.', 'success');
      });
    }

    if (window.location.hash.includes('access_token=') || window.location.hash.startsWith('#admin') || window.location.hash === '#login' || window.location.hash === '#account' || window.location.hash === '#profile') {
      window.location.hash = '#customer/dashboard';
      renderCurrentView();
    } else {
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

events.on('update-user-profile', (data) => {
  state.customerProfile = { ...state.customerProfile, ...data };
  localStorage.setItem('fh_customer_profile', JSON.stringify(state.customerProfile));
  if (state.customerUser) {
    state.customerUser = updateCustomerProfile(data);
  }
  updateChrome();
  showToast(`📱 Mobile number & contact profile updated (${state.customerProfile.phone})!`, 'success');
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

// Router & View Rendering
async function renderCurrentView() {
  const appContainer = document.getElementById('app-view');
  const navContainer = document.getElementById('navbar-container');
  const drawerContainer = document.getElementById('cart-drawer-container');
  const profileContainer = document.getElementById('user-profile-container');
  const authContainer = document.getElementById('customer-auth-container');
  const floatingWaContainer = document.getElementById('floating-whatsapp-container');
  if (!appContainer) return;

  const rawHash = window.location.hash || '#home';
  const [route, queryString] = rawHash.split('?');
  const params = new URLSearchParams(queryString || '');

  // If the URL contains an OAuth token, wait for Supabase to finish session processing
  if (rawHash.includes('access_token=') || rawHash.includes('refresh_token=')) {
    return;
  }

  window.scrollTo({ top: 0, behavior: 'instant' });

  // Admin Portal Routes with Strict Role Guard
  if (route.startsWith('#admin')) {
    // Single Unified Portal redirection: #admin/login routes to unified portal
    if (route === '#admin/login') {
      state.customerAuthTab = 'login';
      state.isCustomerAuthOpen = true;
      updateChrome();
      window.location.hash = '#home';
      return;
    }

    // Strict Role-Based Security: Non-admins cannot access admin views or data
    if (!isCurrentAdmin()) {
      if (state.customerUser) {
        showToast('⛔ Access Denied: Administrator privileges required.', 'danger');
      } else {
        showToast('🔒 Please sign in with administrator credentials.', 'info');
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

  // Customer Dashboard Routes (Strict Customer Isolation)
  if (route === '#customer/dashboard' || route === '#customer-dashboard' || route === '#account' || route === '#profile' || route === '#dashboard') {
    if (isCurrentAdmin()) {
      window.location.hash = '#admin/overview';
      return;
    }
    if (!state.customerUser) {
      showToast('🔒 Please sign in to access your customer dashboard.', 'danger');
      state.customerAuthTab = 'login';
      state.isCustomerAuthOpen = true;
      updateChrome();
      window.location.hash = '#home';
      return;
    }
    updateChrome();
    renderCustomerDashboardView(appContainer, state, events);
    return;
  }

  updateChrome();

  if (route === '#shop') {
    renderShopView(appContainer, state, events, params);
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

  // Handle real Supabase Google OAuth callback session
  const client = getClient();
  if (client) {
    try {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user && !state.customerUser && !isCurrentAdmin()) {
        const u = session.user;
        const res = await authenticateOAuthUser('google', {
          id: u.id,
          email: u.email,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email.split('@')[0],
          avatar: u.user_metadata?.avatar_url || '/images/social-user.png'
        });
        applyAuthenticatedSession(res, 'Signed in successfully with Google.');
      }

      client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user && !state.customerUser && !isCurrentAdmin()) {
          const u = session.user;
          const res = await authenticateOAuthUser('google', {
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email.split('@')[0],
            avatar: u.user_metadata?.avatar_url || '/images/social-user.png'
          });
          applyAuthenticatedSession(res, 'Signed in successfully with Google.');
        }
      });
    } catch (e) {
      console.warn('Supabase OAuth session check error:', e);
    }
  }

  updateChrome();
  renderCurrentView();
});

events.on('products-updated', (updatedList) => {
  if (Array.isArray(updatedList)) {
    state.products = updatedList;
    renderCurrentView();
  }
});

window.addEventListener('hashchange', () => {
  if (speedInsights?.setRoute) {
    speedInsights.setRoute(window.location.hash || '#home');
  }
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
        message: `🎉 Thank you for subscribing, ${email}! Your 10% coupon code is HUB10.`, 
        type: 'success' 
      });
      e.target.reset();
    }
  }
});

