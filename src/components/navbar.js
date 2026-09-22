import { isCurrentAdmin } from '../services/customer-auth.js';
import { resolveCloudImageUrl } from '../utils/cloud-image-resolver.js';

export function renderNavbar(container, state, events) {
  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  container.innerHTML = `
    <header class="figma-header">
      <div class="figma-navbar">
        <div style="display: flex; align-items: center;">
          <!-- Mobile Menu Hamburger (Visible only on mobile/tablet) -->
          <button class="mobile-nav-toggle" id="nav-mobile-toggle" aria-label="Open navigation menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <!-- Logo from Figma Screenshot 1 -->
          <a href="#home" class="figma-logo-wrap" id="nav-brand-logo">
            <img src="/images/furniture-hub-logo.png" alt="Furniture Hub Dhangadhi" class="figma-logo-img">
          </a>
        </div>

        <!-- Center Nav Links from Figma Screenshot 1 -->
        <nav class="figma-nav-center">
          <ul class="figma-nav-links">
            <li>
              <button class="figma-nav-link" id="nav-shop-trigger" style="font-size: 0.95rem; font-weight: 500;">
                <span>Shop</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </li>
            <li><a href="#shop?filter=on-sale">On Sale</a></li>
            <li><a href="#shop?filter=new-arrivals">New Arrivals</a></li>
            <li><a href="#track" style="font-weight: 600; color: #122d25;">Track Order</a></li>
            <li><a href="#about">About</a></li>
          </ul>
        </nav>

        <!-- Right Action Icons from Figma Screenshot 1 -->
        <div class="figma-nav-actions">
          <!-- Search Icon -->
          <button class="figma-action-btn" id="nav-search-btn" title="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>

          <!-- Cart Icon -->
          <button class="figma-action-btn" id="nav-cart-btn" title="Cart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            ${cartCount > 0 ? `<span class="cart-counter-badge" id="cart-counter">${cartCount}</span>` : ''}
          </button>

          <!-- Unified Account / Admin / Sign In Button -->
          ${isCurrentAdmin() ? `
            <a href="#admin/overview" class="nav-user-badge-btn" id="nav-user-btn" title="Store Administrator Dashboard" style="text-decoration: none; border-color: rgba(18, 45, 37, 0.3); background: rgba(18, 45, 37, 0.05);">
              <span class="nav-user-avatar" style="background: #122d25; color: #ffffff;">🛡️</span>
              <span class="nav-user-name" style="font-weight: 700; color: #122d25;">Admin</span>
            </a>
          ` : state.customerUser ? `
            <a href="#customer/dashboard" class="nav-user-badge-btn" id="nav-user-btn" title="Customer Dashboard: ${state.customerUser.name}" style="text-decoration: none;">
              <span class="nav-user-avatar">
                ${(state.customerUser.name.trim().split(' ').length > 1 
                  ? state.customerUser.name.trim().split(' ')[0][0] + state.customerUser.name.trim().split(' ').slice(-1)[0][0]
                  : state.customerUser.name.slice(0, 2)).toUpperCase()}
              </span>
              <span class="nav-user-name">${state.customerUser.name.trim().split(' ')[0]}</span>
            </a>
          ` : `
            <button class="figma-action-btn nav-signin-btn" id="nav-user-btn" title="Sign In (Customer & Store Management)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span class="nav-signin-label">Sign In</span>
            </button>
          `}

          <!-- Nepal Flag Badge (SVG to avoid Windows emoji NP text bug) -->
          <span class="nepal-flag-icon" role="img" title="Nepal Delivery" aria-label="Nepal Delivery">
            <svg width="20" height="22" viewBox="0 0 24 28" fill="none" class="nepal-flag-svg" style="display: inline-block; vertical-align: middle;" aria-hidden="true">
              <path d="M2 1V27H6V22.5L22 22.5L11 12L22 12L2 1Z" fill="#DC143C" stroke="#003893" stroke-width="2" stroke-linejoin="round"/>
              <path d="M5.5 8.5C7.2 8.5 8.5 7.2 8.5 5.5C7.8 6.5 6.5 6.5 5.5 6.2V8.5Z" fill="#ffffff"/>
              <circle cx="8" cy="2.5" r="2.5" fill="#ffffff"/>
            </svg>
          </span>
        </div>
      </div>

      <!-- Mega Menu Dropdown -->
      <div class="figma-mega-menu" id="mega-menu-dropdown">
        <div class="mega-grid-inner">
          <div>
            <div class="mega-title">Seatings</div>
            <ul class="mega-items-list">
              <li><a href="#shop?category=Seatings">Argo Office Chair</a></li>
              <li><a href="#shop?category=Seatings">Valentina Accent Chair</a></li>
              <li><a href="#shop?category=Seatings">Nordic Lounge Bench</a></li>
            </ul>
          </div>
          <div>
            <div class="mega-title">Surfaces</div>
            <ul class="mega-items-list">
              <li><a href="#shop?category=Surfaces">Winnie Side Table</a></li>
              <li><a href="#shop?category=Surfaces">Scandinavian Dining Table</a></li>
            </ul>
          </div>
          <div>
            <div class="mega-title">Decorations & Greens</div>
            <ul class="mega-items-list">
              <li><a href="#shop?category=Greens">Botanical Indoor Green</a></li>
              <li><a href="#shop?category=Decorations">Artisan Ceramic Vase</a></li>
              <li><a href="#shop?category=Decorations">Halo Standing Lamp</a></li>
            </ul>
          </div>
          <div style="background: var(--color-bg-light); border-radius: 12px; padding: 20px;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--color-primary); margin-bottom: 6px;">
              Premium Living Combos
            </div>
            <p style="font-size: 0.82rem; color: var(--color-text-muted); margin-bottom: 12px;">
              Coordinated furniture sets curated to elevate your space.
            </p>
            <a href="#shop?category=Combos" class="figma-pill-btn dark-outline" style="padding: 6px 18px; font-size: 0.8rem;">
              View Combos
            </a>
          </div>
        </div>
      </div>
    </header>

    <!-- Interactive Search Modal -->
    <div class="search-modal-backdrop" id="search-modal-backdrop">
      <div class="search-modal-card">
        <div class="search-modal-header">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-primary); flex-shrink: 0;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="search-modal-input" id="search-modal-input" placeholder="Search furniture, categories, combos..." autocomplete="off">
          <button class="btn-icon" id="search-modal-close-btn" aria-label="Close search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="search-modal-body">
          <div class="search-chips-label">Popular Searches</div>
          <div class="search-chips-row">
            <button class="search-chip" data-search-term="Argo Office Chair">Argo Chair</button>
            <button class="search-chip" data-search-term="Sofa Decor Combo">Sofa Combo</button>
            <button class="search-chip" data-search-term="Winnie Side Table">Winnie Table</button>
            <button class="search-chip" data-search-term="Halo Standing Lamp">Halo Lamp</button>
            <button class="search-chip" data-search-term="Dining Table">Dining Table</button>
          </div>
          <div class="search-chips-label" id="search-results-heading">Suggested Products</div>
          <div class="search-results-list" id="search-results-list">
            <!-- Dynamic results populated in JS -->
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation Drawer -->
    <div class="mobile-nav-backdrop" id="mobile-nav-backdrop"></div>
    <div class="mobile-nav-drawer" id="mobile-nav-drawer">
      <div class="mobile-nav-header">
        <img src="/images/furniture-hub-logo.png" alt="Furniture Hub Dhangadhi" style="height: 38px; width: auto; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
        <button class="btn-icon" id="mobile-nav-close-btn" aria-label="Close menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="mobile-nav-body">
        <ul class="mobile-nav-list">
          <li><a href="#home" class="mobile-nav-link">Home</a></li>
          <li><a href="#shop" class="mobile-nav-link">Shop Catalog</a></li>
          <li><a href="#shop?filter=on-sale" class="mobile-nav-link">On Sale</a></li>
          <li><a href="#shop?filter=new-arrivals" class="mobile-nav-link">New Arrivals</a></li>
          <li><a href="#shop?filter=wishlist" class="mobile-nav-link">Wishlist (${state.wishlist.length})</a></li>
          ${state.customerUser ? `
            <li>
              <a href="#customer/dashboard" id="nav-mobile-profile-link" class="mobile-nav-link" style="text-decoration: none; width: 100%; text-align: left; padding: 10px 0; font-size: 0.95rem; font-family: inherit; cursor: pointer; color: inherit; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="nav-user-avatar" style="width: 24px; height: 24px; font-size: 0.7rem;">
                    ${(state.customerUser.name.trim().split(' ').length > 1 
                      ? state.customerUser.name.trim().split(' ')[0][0] + state.customerUser.name.trim().split(' ').slice(-1)[0][0]
                      : state.customerUser.name.slice(0, 2)).toUpperCase()}
                  </span>
                  <span>${state.customerUser.name}</span>
                </div>
                <span style="font-size: 0.72rem; color: #2e7d32; font-weight: 700;">Dashboard & Orders</span>
              </a>
            </li>
          ` : `
            <li>
              <button id="nav-mobile-signin-link" class="mobile-nav-link" style="background: none; border: none; width: 100%; text-align: left; padding: 10px 0; font-size: 0.95rem; font-family: inherit; cursor: pointer; color: #122d25; font-weight: 700; display: flex; align-items: center; justify-content: space-between;">
                <span>👤 Customer Sign In / Register</span>
                <span style="font-size: 0.75rem; background: var(--color-primary); color: #ffffff; padding: 2px 8px; border-radius: 10px;">Login</span>
              </button>
            </li>
          `}
          ${isCurrentAdmin() ? `
            <li style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(18, 45, 37, 0.12);">
              <a href="#admin/overview" class="mobile-nav-link" style="font-weight: 700; color: #122d25; display: flex; align-items: center; justify-content: space-between;">
                <span>⚙️ Admin Dashboard</span>
                <span style="background: #122d25; color: #ffffff; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Admin</span>
              </a>
            </li>
          ` : ''}
        </ul>

        <hr style="border: none; height: 1px; background: rgba(18, 45, 37, 0.08);">

        <div>
          <div class="mobile-cat-heading">Categories</div>
          <ul class="mobile-nav-list">
            <li><a href="#shop?category=Seatings" class="mobile-nav-link">Seatings & Chairs</a></li>
            <li><a href="#shop?category=Surfaces" class="mobile-nav-link">Surfaces & Tables</a></li>
            <li><a href="#shop?category=Decorations" class="mobile-nav-link">Decorations & Lamps</a></li>
            <li><a href="#shop?category=Greens" class="mobile-nav-link">Greens & Botanicals</a></li>
            <li><a href="#shop?category=Combos" class="mobile-nav-link">Living Combos</a></li>
          </ul>
        </div>

        <hr style="border: none; height: 1px; background: rgba(18, 45, 37, 0.08); margin: 14px 0;">

        <div>
          <div class="mobile-cat-heading">Information & Help</div>
          <ul class="mobile-nav-list">
            <li><a href="#track" class="mobile-nav-link" style="font-weight: 700; color: #122d25;">📍 Track Order Live</a></li>
            <li><a href="#about" class="mobile-nav-link">About Our Story</a></li>
            <li><a href="#faq" class="mobile-nav-link">Help & FAQs</a></li>
            <li><a href="#terms" class="mobile-nav-link">Terms & Privacy</a></li>
          </ul>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  const shopTrigger = container.querySelector('#nav-shop-trigger');
  const megaMenu = container.querySelector('#mega-menu-dropdown');
  
  if (shopTrigger && megaMenu) {
    shopTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      megaMenu.classList.toggle('open');
    });

    megaMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        megaMenu.classList.remove('open');
      });
    });

    document.addEventListener('click', (e) => {
      if (!megaMenu.contains(e.target) && !shopTrigger.contains(e.target)) {
        megaMenu.classList.remove('open');
      }
    });
  }

    // Cart Button
    const cartBtn = container.querySelector('#nav-cart-btn');
    if (cartBtn) {
      cartBtn.addEventListener('click', () => {
        events.emit('open-cart');
      });
    }

    // User Profile / Customer Auth Button
    const userBtn = container.querySelector('#nav-user-btn');
    if (userBtn) {
      userBtn.addEventListener('click', (e) => {
        if (isCurrentAdmin()) {
          window.location.hash = '#admin/overview';
          return;
        }
        if (state.customerUser) {
          window.location.hash = '#customer/dashboard';
          return;
        }
        e.preventDefault();
        events.emit('open-customer-auth');
      });
    }

    const mobileProfileLink = container.querySelector('#nav-mobile-profile-link');
    if (mobileProfileLink) {
      mobileProfileLink.addEventListener('click', () => {
        closeMobileNav();
        window.location.hash = '#customer/dashboard';
      });
    }

    const mobileSigninLink = container.querySelector('#nav-mobile-signin-link');
    if (mobileSigninLink) {
      mobileSigninLink.addEventListener('click', () => {
        closeMobileNav();
        events.emit('open-customer-auth');
      });
    }

  // Interactive Search Modal Logic
  const searchBtn = container.querySelector('#nav-search-btn');
  const searchModalBackdrop = container.querySelector('#search-modal-backdrop');
  const searchInput = container.querySelector('#search-modal-input');
  const searchCloseBtn = container.querySelector('#search-modal-close-btn');
  const searchResultsList = container.querySelector('#search-results-list');
  const searchResultsHeading = container.querySelector('#search-results-heading');

  function renderSearchResults(query = '') {
    if (!searchResultsList) return;
    const q = query.trim().toLowerCase();
    let matches = state.products;

    if (q) {
      matches = state.products.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
      if (searchResultsHeading) {
        searchResultsHeading.textContent = `Search Results (${matches.length})`;
      }
    } else {
      if (searchResultsHeading) {
        searchResultsHeading.textContent = 'Suggested Products';
      }
      matches = state.products.slice(0, 4);
    }

    if (matches.length === 0) {
      searchResultsList.innerHTML = `
        <div style="padding: 24px 0; text-align: center; color: var(--color-text-subtle);">
          No products found matching "<strong>${query}</strong>". Try another keyword.
        </div>
      `;
      return;
    }

    searchResultsList.innerHTML = matches.slice(0, 5).map(p => `
      <a href="#product-detail?id=${p.id}" class="search-result-row" data-id="${p.id}">
        <img src="${resolveCloudImageUrl(p.image)}" alt="${p.name}" class="search-result-img" onerror="this.src='/images/hero-living-room.png'">
        <div class="search-result-info">
          <div class="search-result-title">${p.name}</div>
          <div class="search-result-meta">${p.category} &bull; Rating: ${p.rating} ★</div>
        </div>
        <div class="search-result-price">Rs. ${p.price.toLocaleString()}/-</div>
      </a>
    `).join('');

    searchResultsList.querySelectorAll('.search-result-row').forEach(row => {
      row.addEventListener('click', () => {
        closeSearchModal();
      });
    });
  }

  function openSearchModal() {
    if (!searchModalBackdrop) return;
    searchModalBackdrop.classList.add('open');
    renderSearchResults('');
    if (searchInput) {
      searchInput.value = '';
      setTimeout(() => searchInput.focus(), 100);
    }
  }

  function closeSearchModal() {
    if (searchModalBackdrop) {
      searchModalBackdrop.classList.remove('open');
    }
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', openSearchModal);
  }

  if (searchCloseBtn) {
    searchCloseBtn.addEventListener('click', closeSearchModal);
  }

  if (searchModalBackdrop) {
    searchModalBackdrop.addEventListener('click', (e) => {
      if (e.target === searchModalBackdrop) closeSearchModal();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderSearchResults(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) {
          closeSearchModal();
          window.location.hash = `#shop?search=${encodeURIComponent(q)}`;
        }
      } else if (e.key === 'Escape') {
        closeSearchModal();
      }
    });
  }

  // Chips click
  container.querySelectorAll('.search-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const term = chip.dataset.searchTerm;
      if (searchInput) {
        searchInput.value = term;
        renderSearchResults(term);
      }
    });
  });

  // Mobile Navigation Drawer Logic
  const mobileToggle = container.querySelector('#nav-mobile-toggle');
  const mobileBackdrop = container.querySelector('#mobile-nav-backdrop');
  const mobileDrawer = container.querySelector('#mobile-nav-drawer');
  const mobileClose = container.querySelector('#mobile-nav-close-btn');

  function openMobileNav() {
    if (mobileBackdrop) mobileBackdrop.classList.add('open');
    if (mobileDrawer) mobileDrawer.classList.add('open');
  }

  function closeMobileNav() {
    if (mobileBackdrop) mobileBackdrop.classList.remove('open');
    if (mobileDrawer) mobileDrawer.classList.remove('open');
  }

  if (mobileToggle) mobileToggle.addEventListener('click', openMobileNav);
  if (mobileClose) mobileClose.addEventListener('click', closeMobileNav);
  if (mobileBackdrop) mobileBackdrop.addEventListener('click', closeMobileNav);

  container.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });
}
