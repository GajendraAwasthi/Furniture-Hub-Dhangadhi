import { renderFigmaFooter } from '../components/footer.js';
import { isCurrentAdmin } from '../services/customer-auth.js';
import { openProductReviewsModal } from '../components/product-reviews-modal.js';

export function renderShopView(container, state, events, params) {
  let activeCategory = params.get('category') || 'All';
  let activeFilter = params.get('filter') || 'all';
  let searchQuery = params.get('search') || '';
  let activeSort = params.get('sort') || 'featured';
  let currentPage = parseInt(params.get('page') || '1', 10);
  const itemsPerPage = 8;

  // Filter products
  let filtered = state.products.slice();

  if (activeCategory && activeCategory !== 'All') {
    filtered = filtered.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());
  }

  if (activeFilter === 'new-arrivals') {
    filtered = filtered.filter(p => p.isNewArrival);
  } else if (activeFilter === 'best-sellers') {
    filtered = filtered.filter(p => p.isBestSeller);
  } else if (activeFilter === 'on-sale') {
    filtered = filtered.filter(p => p.originalPrice && p.originalPrice > p.price);
  } else if (activeFilter === 'wishlist') {
    filtered = filtered.filter(p => state.wishlist.includes(p.id));
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q)
    );
  }

  // Sort products
  if (activeSort === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (activeSort === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (activeSort === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  } else if (activeSort === 'newest') {
    filtered.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0));
  }

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  if (currentPage > totalPages) currentPage = 1;
  const pagedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  function formatPrice(num) {
    return 'Rs. ' + num.toLocaleString() + '/-';
  }

  function renderStars(rating) {
    const full = Math.floor(rating);
    let s = '';
    for (let i = 0; i < full; i++) {
      s += `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    return s;
  }

  const categories = ['All', 'Seatings', 'Surfaces', 'Decorations', 'Greens', 'Long Sofa', 'Combos'];

  container.innerHTML = `
    <div class="container catalog-header">
      <!-- Breadcrumbs -->
      <nav class="breadcrumbs">
        <a href="#home">Home</a>
        <span class="separator">/</span>
        <a href="#shop">Shop Now</a>
        ${activeCategory !== 'All' ? `<span class="separator">/</span><span>${activeCategory}</span>` : ''}
        ${activeFilter === 'wishlist' ? `<span class="separator">/</span><span>My Wishlist</span>` : ''}
      </nav>

      <!-- Title & Filters from Figma: Accessories for your space -->
      <div class="catalog-title-bar">
        <div>
          <h1 class="heading-section">
            ${activeFilter === 'wishlist' ? 'My Wishlist' : 'Accessories for your space'}
          </h1>
          <p class="text-subtitle">
            ${activeFilter === 'wishlist' 
              ? 'Saved items curated for your dream interior' 
              : 'Explore our catalog of executive chairs, hand-finished surfaces, and signature living room combos.'}
          </p>
        </div>
      </div>

      ${!state.customerUser ? `
        <div class="shop-guest-auth-alert" style="background: linear-gradient(135deg, rgba(18, 45, 37, 0.04) 0%, rgba(18, 45, 37, 0.08) 100%); border: 1.5px solid rgba(18, 45, 37, 0.14); border-radius: 14px; padding: 14px 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 1.4rem;">🔒</span>
            <div>
              <strong style="color: var(--color-primary); font-size: 0.95rem; display: block;">Sign In Required to Shop & Add to Cart</strong>
              <span style="font-size: 0.82rem; color: var(--color-text-subtle);">Browse our collection freely. Sign in with your customer account to add furniture to your cart and place orders.</span>
            </div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="shop-guest-signin-btn" style="padding: 9px 18px; font-weight: 700; border-radius: 10px;">
            Sign In / Register
          </button>
        </div>
      ` : ''}

      <!-- Category Filter Pills (Figma: Chairs, Surfaces, Decorations, Greens, Long Sofa, Combos) -->
      <div class="filter-pills" id="shop-category-pills">
        ${categories.map(cat => `
          <button class="filter-pill ${activeCategory === cat ? 'active' : ''}" data-category="${cat}">
            ${cat === 'Seatings' ? 'Chairs & Seatings' : cat}
          </button>
        `).join('')}
      </div>

      <!-- Controls Row: Result Count, Search Indicator, and Sort -->
      <div class="catalog-controls">
        <div class="results-count">
          Showing <strong>${filtered.length}</strong> items
          ${searchQuery ? ` for "<strong>${searchQuery}</strong>" <a href="#shop" style="color: var(--color-danger); margin-left: 8px;">✕ Clear search</a>` : ''}
          ${activeFilter === 'wishlist' ? ` in your saved wishlist` : ''}
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <label for="catalog-sort-select" style="font-size: 0.88rem; font-weight: 600; color: var(--color-primary);">
            Sort by:
          </label>
          <select id="catalog-sort-select" class="sort-select">
            <option value="featured" ${activeSort === 'featured' ? 'selected' : ''}>Featured Curation</option>
            <option value="price-low" ${activeSort === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
            <option value="price-high" ${activeSort === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
            <option value="rating" ${activeSort === 'rating' ? 'selected' : ''}>Highest Customer Rating</option>
            <option value="newest" ${activeSort === 'newest' ? 'selected' : ''}>Newest Arrivals</option>
          </select>
        </div>
      </div>

      <!-- Main Catalog Layout with Figma Chair Sidebar -->
      <div class="catalog-main-layout">
        <div class="catalog-products-column">
          <!-- Products Grid -->
          ${pagedItems.length > 0 ? `
            <div class="product-grid">
              ${pagedItems.map(p => {
                const inWishlist = state.wishlist.includes(p.id);
                return `
                  <div class="product-card" data-id="${p.id}">
                    <div class="product-media">
                      <span class="product-badge-overlay badge-tag ${p.badge === 'Sale' ? 'badge-sale' : ''}">
                        ${p.badge || p.category}
                      </span>
                      <button class="wishlist-btn ${inWishlist ? 'active' : ''}" data-wishlist-id="${p.id}" title="Toggle Wishlist">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="${inWishlist ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      </button>
                      <img src="${p.image || '/images/hero-living-room.png'}" alt="${p.name}" loading="lazy" class="product-navigate-trigger" data-id="${p.id}" onerror="this.src='/images/hero-living-room.png'">
                    </div>
                    <div class="product-info">
                      <span class="product-category-label">${p.category}</span>
                      <h3 class="product-title product-navigate-trigger" data-id="${p.id}">${p.name}</h3>
                      <div class="product-rating product-rating-interactive" data-open-reviews-pid="${p.id}" title="View ${p.name} reviews">
                        <span class="stars">${renderStars(p.rating)}</span>
                        <span class="rating-count">(${p.reviewCount} reviews)</span>
                      </div>
                      <div class="product-price-row">
                        <div>
                          <span class="price-current">${formatPrice(p.price)}</span>
                          ${p.originalPrice ? `<span class="price-original">${formatPrice(p.originalPrice)}</span>` : ''}
                        </div>
                        <button class="card-add-btn" data-add-id="${p.id}" title="Add to Cart" aria-label="Add ${p.name} to cart">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Pagination (From Figma: Page 1, 2, 3) -->
            <div class="pagination">
              ${Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => `
                <button class="page-btn ${pageNum === currentPage ? 'active' : ''}" data-page="${pageNum}">
                  ${pageNum}
                </button>
              `).join('')}
            </div>
          ` : `
            <div style="text-align: center; padding: 80px 20px; background: #ffffff; border-radius: 16px; border: 1px solid rgba(18, 45, 37, 0.1);">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; color: var(--color-text-subtle);">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <h3 style="font-size: 1.4rem; margin-bottom: 8px;">${state.products.length === 0 ? 'Catalog is currently empty' : 'No matching furniture pieces found'}</h3>
              <p class="text-subtitle" style="margin-bottom: 24px;">
                ${state.products.length === 0 
                  ? 'New handcrafted furniture collections are uploaded directly through the store administration portal.' 
                  : 'Try modifying your search keywords or resetting your category filters.'}
              </p>
              ${state.products.length === 0 
                ? (isCurrentAdmin() ? '<a href="#admin/products" class="btn btn-primary">Add Product in Admin</a>' : '<a href="#home" class="btn btn-primary">Return to Home</a>')
                : '<a href="#shop" class="btn btn-primary">Reset Filters</a>'
              }
            </div>
          `}
        </div>

        <!-- Figma Chair Frame Sidebar (Exact Frame Rectangle 54) -->
        <aside class="figma-category-sidebar">
          <h3 class="sidebar-title">Category</h3>
          <ul class="sidebar-cat-list">
            <li class="sidebar-cat-item">
              <button class="sidebar-cat-btn ${activeCategory.toLowerCase() === 'all' ? 'active' : ''}" data-category="All">
                <span>All Products</span>
                <span class="sidebar-count-badge">${state.products.length}</span>
              </button>
            </li>
            ${['Seatings', 'Surfaces', 'Decorations', 'Greens', 'Long Sofa', 'Combos'].map(cat => {
              const count = state.products.filter(p => p.category.toLowerCase() === cat.toLowerCase()).length;
              const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
              return `
                <li class="sidebar-cat-item">
                  <button class="sidebar-cat-btn ${isActive ? 'active' : ''}" data-category="${cat}">
                    <span>${cat === 'Seatings' ? 'Chairs & Seatings' : cat}</span>
                    <span class="sidebar-count-badge">${count}</span>
                  </button>
                </li>
              `;
            }).join('')}
          </ul>
        </aside>
      </div>
    </div>

    <!-- EXACT FIGMA NEWSLETTER & FOOTER (Matching Screenshot) -->
    ${renderFigmaFooter()}
  `;

  // Attach event listeners for category pills & sidebar buttons
  container.querySelectorAll('[data-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
      updateShopUrl({ category: cat, page: 1 });
    });
  });

  // Sort dropdown
  const sortSelect = container.querySelector('#catalog-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      updateShopUrl({ sort: sortSelect.value, page: 1 });
    });
  }

  // Pagination buttons
  container.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      updateShopUrl({ page });
    });
  });

  // Card navigation
  container.querySelectorAll('.product-navigate-trigger').forEach(el => {
    el.addEventListener('click', () => {
      const pid = el.dataset.id;
      window.location.hash = `#product-detail?id=${encodeURIComponent(pid)}`;
    });
  });

  // Add to cart (+ Button with Auth Guard)
  container.querySelectorAll('.card-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!state.customerUser && !isCurrentAdmin()) {
        events.emit('toast', { message: '🔒 Please sign in to shop and add items to your cart.', type: 'danger' });
        events.emit('open-customer-auth');
        return;
      }
      const pid = btn.dataset.addId;
      const product = state.products.find(p => p.id === pid);
      if (product) {
        events.emit('add-to-cart', { product, quantity: 1 });
      }
    });
  });

  const guestSignInBtn = container.querySelector('#shop-guest-signin-btn');
  if (guestSignInBtn) {
    guestSignInBtn.addEventListener('click', () => {
      events.emit('open-customer-auth');
    });
  }

  // Open Reviews Modal when clicking card rating
  container.querySelectorAll('[data-open-reviews-pid]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = btn.dataset.openReviewsPid;
      const product = state.products.find(p => p.id === pid);
      if (product) {
        openProductReviewsModal(product, events);
      }
    });
  });



  // Wishlist toggle
  container.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = btn.dataset.wishlistId;
      events.emit('toggle-wishlist', pid);
    });
  });

  const shopNewsForm = container.querySelector('#shop-newsletter-form');
  if (shopNewsForm) {
    shopNewsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      events.emit('toast', { message: '🎉 Thank you for subscribing!', type: 'success' });
      shopNewsForm.reset();
    });
  }

  function updateShopUrl(newParams) {
    const currentParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    Object.entries(newParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        currentParams.set(k, v);
      } else {
        currentParams.delete(k);
      }
    });
    window.location.hash = `#shop?${currentParams.toString()}`;
  }
}
