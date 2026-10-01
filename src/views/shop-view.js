import { renderFigmaFooter } from '../components/footer.js';
import { isCurrentAdmin } from '../services/customer-auth.js';
import { openProductReviewsModal } from '../components/product-reviews-modal.js';
import { resolveCloudImageUrl } from '../utils/cloud-image-resolver.js';
import { escapeHtml } from '../utils/security.js';

export function renderShopView(container, state, events, params) {
  const availableCategories = Array.isArray(state?.categories) ? state.categories : [];
  const categoryNames = availableCategories.map(c => typeof c === 'string' ? c : c.name).filter(Boolean);
  const allCategoryOptions = ['All', ...categoryNames];

  const rawCategory = (params.get('category') || 'All').toLowerCase();
  let activeCategory = allCategoryOptions.find(c => {
    const slug = c.toLowerCase().replace(/\s+/g, '-');
    return c.toLowerCase() === rawCategory || slug === rawCategory;
  }) || 'All';
  let activeFilter = params.get('filter') || 'all';
  let searchQuery = params.get('search') || '';
  let activeSort = params.get('sort') || 'featured';
  let currentPage = parseInt(params.get('page') || '1', 10);
  const itemsPerPage = 8;

  // Filter products
  let filtered = state.products.slice();

  if (activeCategory && activeCategory !== 'All') {
    filtered = filtered.filter(p => p.category && p.category.toLowerCase() === activeCategory.toLowerCase());
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

  const categories = allCategoryOptions;

  let pageHeading = 'Furniture Collection in Dhangadhi';
  let pageSubheading = 'Explore our catalog of executive chairs, hand-finished surfaces, and signature living room combos.';
  if (activeFilter === 'wishlist') {
    pageHeading = 'My Wishlist';
    pageSubheading = 'Saved items curated for your dream interior';
  } else if (activeCategory !== 'All') {
    pageHeading = `${activeCategory} in Dhangadhi, Kailali`;
    pageSubheading = `Browse handcrafted ${activeCategory.toLowerCase()} available at Furniture Hub Dhangadhi with delivery across Sudurpashchim.`;
  }

  container.innerHTML = `
    <div class="container catalog-header">
      <!-- Breadcrumbs -->
      <nav class="breadcrumbs">
        <a href="#home">Home</a>
        <span class="separator">/</span>
        <a href="#shop">Shop Now</a>
        ${activeCategory !== 'All' ? `<span class="separator">/</span><span>${escapeHtml(activeCategory)}</span>` : ''}
        ${activeFilter === 'wishlist' ? `<span class="separator">/</span><span>My Wishlist</span>` : ''}
      </nav>

      <!-- Title & Filters from Figma: Accessories for your space -->
      <div class="catalog-title-bar">
        <div>
          <h1 class="heading-section">
            ${escapeHtml(pageHeading)}
          </h1>
          <p class="text-subtitle">
            ${escapeHtml(pageSubheading)}
          </p>
        </div>
      </div>

      <!-- Category Filter Pills -->
      <div class="filter-pills" id="shop-category-pills">
        ${categories.map(cat => `
          <button class="filter-pill ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}" data-category="${escapeHtml(cat)}">
            ${escapeHtml(cat)}
          </button>
        `).join('')}
      </div>

      <!-- Controls Row: Result Count, Search Indicator, and Sort -->
      <div class="catalog-controls">
        <div class="results-count">
          Showing <strong>${filtered.length}</strong> items
          ${searchQuery ? ` for "<strong>${escapeHtml(searchQuery)}</strong>" <a href="#shop" style="color: var(--color-danger); margin-left: 8px;">✕ Clear search</a>` : ''}
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
                  <div class="product-card" data-id="${escapeHtml(p.id)}">
                    <div class="product-media">
                      <span class="product-badge-overlay badge-tag ${p.badge === 'Sale' ? 'badge-sale' : ''}">
                        ${escapeHtml(p.badge || p.category)}
                      </span>
                      <button class="wishlist-btn ${inWishlist ? 'active' : ''}" data-wishlist-id="${escapeHtml(p.id)}" title="Toggle Wishlist">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="${inWishlist ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      </button>
                      <img src="${resolveCloudImageUrl(p.image)}" alt="${escapeHtml(p.name)} — Furniture Hub Dhangadhi" width="300" height="260" loading="lazy" decoding="async" class="product-navigate-trigger" data-id="${escapeHtml(p.id)}" onerror="this.src='/images/hero-living-room.png'">
                    </div>
                    <div class="product-info">
                      <span class="product-category-label">${escapeHtml(p.category)}</span>
                      <h3 class="product-title"><a href="/products/${escapeHtml(p.id)}" class="product-navigate-trigger" data-id="${escapeHtml(p.id)}" style="color: inherit; text-decoration: none;">${escapeHtml(p.name)}</a></h3>
                      <div class="product-rating product-rating-interactive" data-open-reviews-pid="${escapeHtml(p.id)}" title="View ${escapeHtml(p.name)} reviews">
                        <span class="stars">${renderStars(p.rating)}</span>
                        <span class="rating-count">(${p.reviewCount} reviews)</span>
                      </div>
                      <div class="product-price-row">
                        <div>
                          <span class="price-current">${formatPrice(p.price)}</span>
                          ${p.originalPrice ? `<span class="price-original">${formatPrice(p.originalPrice)}</span>` : ''}
                        </div>
                        <button class="card-add-btn" data-add-id="${escapeHtml(p.id)}" title="Add to Cart" aria-label="Add ${escapeHtml(p.name)} to cart">
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
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 48px 24px; min-height: 420px; height: 100%; background: #ffffff; border-radius: 16px; border: 1px solid rgba(18, 45, 37, 0.1); box-sizing: border-box;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; color: var(--color-text-subtle);">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <h3 style="font-size: 1.4rem; font-weight: 700; color: var(--color-primary); margin-bottom: 8px; text-align: center;">${state.products.length === 0 ? 'Catalog is currently empty' : 'No matching furniture pieces found'}</h3>
              <p class="text-subtitle" style="margin: 0 auto 24px auto; text-align: center; max-width: 520px;">
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
            ${categoryNames.map(cat => {
              const count = state.products.filter(p => p.category && p.category.toLowerCase() === cat.toLowerCase()).length;
              const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
              return `
                <li class="sidebar-cat-item">
                  <button class="sidebar-cat-btn ${isActive ? 'active' : ''}" data-category="${escapeHtml(cat)}">
                    <span>${escapeHtml(cat)}</span>
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
    el.addEventListener('click', (e) => {
      if ((e.target.closest('a') || el.tagName === 'A') && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button && e.button !== 0))) {
        return;
      }
      e.preventDefault();
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
