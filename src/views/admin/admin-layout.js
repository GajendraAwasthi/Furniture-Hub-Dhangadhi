import { logout, getCurrentUser, isSupabaseConfigured } from '../../services/supabase.js';
import { logoutUser } from '../../services/customer-auth.js';
import { getSellerNumber } from '../../services/whatsapp.js';

export async function renderAdminLayout(container, state, events, activeSubView, renderChildContent) {
  const user = await getCurrentUser();
  const isConnected = isSupabaseConfigured();
  const sellerPhone = getSellerNumber();

  const navItems = [
    {
      id: 'overview',
      hash: '#admin/overview',
      label: 'Overview',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`
    },
    {
      id: 'products',
      hash: '#admin/products',
      label: 'Products Database',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`
    },
    {
      id: 'orders',
      hash: '#admin/orders',
      label: 'Orders & Sales',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`
    },
    {
      id: 'settings',
      hash: '#admin/settings',
      label: 'Store Settings',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
    }
  ];

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Administrator';
  const userInitial = userName.charAt(0).toUpperCase();

  container.innerHTML = `
    <div class="admin-shell">
      <!-- SIDEBAR -->
      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="admin-sidebar-header">
          <a href="#admin" class="admin-logo-link">
            <span>Furniture Hub Dhangadhi</span>
            <span class="admin-logo-badge">Admin</span>
          </a>
          <button class="btn-icon" id="admin-sidebar-close" style="color: #ffffff; display: none;">
            ✕
          </button>
        </div>

        <ul class="admin-nav-links">
          ${navItems.map(item => `
            <li class="admin-nav-item ${activeSubView === item.id ? 'active' : ''}">
              <a href="${item.hash}">
                ${item.icon}
                <span>${item.label}</span>
              </a>
            </li>
          `).join('')}

          <li style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08);">
            <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: rgba(255,255,255,0.4); padding: 0 14px 8px;">
              Storefront
            </div>
          </li>
          <li class="admin-nav-item">
            <a href="#home" target="_blank" title="Open live public storefront in new tab">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              <span>View Public Store</span>
            </a>
          </li>
        </ul>

        <div class="admin-sidebar-footer">
          <div class="admin-user-card">
            <div class="admin-user-avatar">${userInitial}</div>
            <div class="admin-user-meta">
              <div class="admin-user-name">${userName}</div>
              <div class="admin-user-role">${user?.email || 'admin@furniturehub.com'}</div>
            </div>
          </div>
          <button class="btn btn-sm btn-accent" id="admin-logout-btn" style="width: 100%; border-color: rgba(255,255,255,0.2); color: #ffffff; background: rgba(255,255,255,0.06);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <main class="admin-main">
        <!-- Top Navigation Bar -->
        <header class="admin-top-bar">
          <div class="admin-top-left">
            <button class="admin-mobile-toggle" id="admin-mobile-toggle" aria-label="Toggle navigation">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            <nav class="admin-breadcrumbs">
              <a href="#admin">Admin</a>
              <span>/</span>
              <span class="active" style="text-transform: capitalize;">${activeSubView}</span>
            </nav>
          </div>

          <div class="admin-top-right">
            <!-- WhatsApp Receiver Number Badge -->
            <a href="#admin/settings" class="admin-wa-badge" title="Active WhatsApp number receiving store orders. Click to change." style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: rgba(37, 211, 102, 0.12); border: 1px solid #25D366; border-radius: 20px; color: #075e54; text-decoration: none; font-size: 0.82rem; font-weight: 700; transition: all 0.2s ease;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/></svg>
              <span>WA: +${sellerPhone}</span>
              <span style="font-size: 0.72rem; text-decoration: underline; color: #122d25; opacity: 0.75;">(Edit)</span>
            </a>

            <!-- Database Connection Status Badge -->
            <div class="db-status-pill ${isConnected ? 'connected' : 'local'}" title="${isConnected ? 'Connected to live Supabase project' : 'Running in local storage fallback mode. Connect Supabase in Settings.'}">
              <span class="db-status-dot"></span>
              <span>${isConnected ? 'Supabase Connected' : 'Local Storage Mode'}</span>
            </div>

            <!-- Settings shortcut -->
            <a href="#admin/settings" class="action-icon-btn" title="Store Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </a>
          </div>
        </header>

        <!-- Dynamic Body Slot -->
        <div class="admin-content" id="admin-content-slot">
          <!-- Sub-view injected here -->
        </div>
      </main>
    </div>
  `;

  // Mobile sidebar toggle
  const sidebar = container.querySelector('#admin-sidebar');
  const mobileToggle = container.querySelector('#admin-mobile-toggle');
  const sidebarClose = container.querySelector('#admin-sidebar-close');

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  if (sidebarClose && sidebar) {
    sidebarClose.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }

  // Logout handler
  const logoutBtn = container.querySelector('#admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logout();
      await logoutUser();
      events.emit('toast', { message: 'Logged out of Admin Portal. See you soon!', type: 'info' });
      window.location.hash = '#home';
    });
  }

  // Render child content
  const slot = container.querySelector('#admin-content-slot');
  if (slot && renderChildContent) {
    await renderChildContent(slot);
  }
}
