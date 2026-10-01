import { renderFigmaFooter } from '../components/footer.js';
import { isCurrentAdmin } from '../services/customer-auth.js';
import { getTopReviews } from '../services/reviews.js';
import { openProductReviewsModal } from '../components/product-reviews-modal.js';
import { resolveCloudImageUrl } from '../utils/cloud-image-resolver.js';
import { escapeHtml } from '../utils/security.js';

export function renderHomeView(container, state, events) {
  function renderStars(rating = 5) {
    let s = '';
    const r = Math.round(rating);
    for (let i = 0; i < 5; i++) {
      s += `<svg width="13" height="13" viewBox="0 0 24 24" fill="${i < r ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    return s;
  }

  // Exact product card matching user Screenshot 2 and 3 with interactive reviews trigger
  function renderExactCard(product) {
    return `
      <div class="figma-product-card" data-id="${escapeHtml(product.id)}">
        <div class="figma-card-img-wrap">
          <img src="${escapeHtml(resolveCloudImageUrl(product.image))}" alt="${escapeHtml(product.name)} — Furniture Hub Dhangadhi" width="300" height="260" loading="lazy" decoding="async" onerror="this.src='/images/hero-living-room.png'">
        </div>
        ${product.category ? `<span class="figma-card-category">${escapeHtml(product.category)}</span>` : ''}
        <h3 class="figma-card-title"><a href="/products/${escapeHtml(product.id)}" style="color: inherit; text-decoration: none;">${escapeHtml(product.name)}</a></h3>
        <div class="figma-card-rating figma-card-rating-interactive" data-open-reviews-pid="${escapeHtml(product.id)}" title="View verified customer reviews">
          <span class="stars">${renderStars(product.rating || 5)}</span>
          <span class="count">(${product.reviewCount || 8} reviews)</span>
        </div>
        <div class="figma-card-price-row" style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px; gap: 8px;">
          <div class="figma-card-price">Rs. ${(product.price || 15000).toLocaleString()}/-</div>
          <button class="card-add-btn home-card-add-btn" data-add-pid="${escapeHtml(product.id)}" title="Add to Cart" aria-label="Add ${escapeHtml(product.name)} to cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  const newArrivals = state.products.filter(p => p.isNewArrival).slice(0, 4);
  const bestSellers = state.products.filter(p => p.isBestSeller).slice(0, 4);
  const reviewsData = getTopReviews(3);

  container.innerHTML = `
    <!-- SCREENSHOT 1: HERO SECTION -->
    <section class="figma-hero">
      <div class="site-container">
        <h1 class="figma-hero-title">
          Find the Right Furniture<br>that Matches You and Your Home
        </h1>
        <p class="figma-hero-subtitle">
          Browse through our diverse range of meticulously curated furniture, curated to bring out your individuality and cater to your sense of style.
        </p>
        <div class="figma-hero-visual">
          <picture>
            <source type="image/avif" srcset="/images/hero-living-room.avif">
            <source type="image/webp" srcset="/images/hero-living-room-600.webp 600w, /images/hero-living-room.webp 1200w" sizes="(max-width: 768px) 100vw, 1160px">
            <img 
              src="/images/hero-living-room.webp" 
              alt="Sofa and Side Table Living Composition" 
              width="1200" 
              height="437" 
              fetchpriority="high"
              decoding="async"
              onerror="this.onerror=null; this.closest('picture')?.querySelectorAll('source').forEach(s => s.remove()); this.src='/images/hero-living-room.png';"
            >
          </picture>
        </div>
        <div class="figma-hero-btn-wrap">
          <a href="#shop" class="figma-pill-btn dark-outline" id="hero-shop-now-btn">
            Shop Now
          </a>
        </div>

        <!-- VALUE PROPOSITION HIGHLIGHT (Direct Import, No Middleman, Custom Production) -->
        <!-- VALUE PROPOSITION HIGHLIGHT (Direct Import, No Middleman, Custom Production) -->
        <div class="fh-value-proposition-banner" id="hero-value-proposition">
          <div class="fh-vp-headline">
            <div class="fh-vp-title-line">THE SAME FURNITURE</div>
            <div class="fh-vp-title-line">YOU SEE ONLINE —</div>
            <div class="fh-vp-title-line fh-vp-price-line">
              <span>AT A BETTER PRICE!</span>
              <span class="fh-vp-flame" role="img" aria-label="deal">🔥</span>
            </div>
          </div>

          <div class="fh-vp-badges">
            <!-- Direct Import -->
            <div class="fh-vp-badge">
              <div class="fh-vp-icon-wrap" title="Direct Import">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <!-- Globe -->
                  <circle cx="17" cy="19" r="13"></circle>
                  <path d="M17 6c3.6 3.6 5.5 8.2 5.5 13s-1.9 9.4-5.5 13c-3.6-3.6-5.5-8.2-5.5-13s1.9-9.4 5.5-13z"></path>
                  <path d="M4 19h26"></path>
                  <path d="M6.5 12.5c3-1.6 6.5-2.5 10.5-2.5s7.5.9 10.5 2.5"></path>
                  <!-- Curved orbit arrow -->
                  <path d="M21 5.5c5.5.8 10 4.2 11.5 9.5"></path>
                  <polyline points="33.5 10 33.5 15.5 28 14.5"></polyline>
                  <!-- Isometric parcel box in foreground with background masking -->
                  <path d="M21 24l8-4 8 4-8 4-8-4z" fill="var(--color-bg-light)"></path>
                  <path d="M25 22l8 4"></path>
                  <path d="M21 24v10.5l8 4v-10.5l-8-4z" fill="var(--color-bg-light)"></path>
                  <path d="M37 24v10.5l-8 4v-10.5l8-4z" fill="var(--color-bg-light)"></path>
                  <line x1="29" y1="28" x2="29" y2="38.5"></line>
                  <line x1="33" y1="26" x2="33" y2="29.5"></line>
                </svg>
              </div>
              <span class="fh-vp-badge-label">DIRECT<br>IMPORT</span>
            </div>

            <!-- No Middleman -->
            <div class="fh-vp-badge">
              <div class="fh-vp-icon-wrap" title="No Middleman">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <!-- Outer circle -->
                  <circle cx="22" cy="22" r="19"></circle>
                  <!-- Dollar Sign -->
                  <line x1="22" y1="7.5" x2="22" y2="17.5"></line>
                  <path d="M24.5 10.2c0-1.1-.9-1.7-2.3-1.7s-2.3.7-2.3 1.5c0 1.8 4.6 1.3 4.6 3.2 0 1.1-.9 1.8-2.3 1.8s-2.3-.7-2.3-1.7"></path>
                  <!-- Handshake -->
                  <path d="M7 23.5l4-2.5v5l-4-2.5z"></path>
                  <path d="M37 23.5l-4-2.5v5l4-2.5z"></path>
                  <path d="M11 23.5l5 3 4-1.5"></path>
                  <path d="M33 23.5l-5 3-4-1.5"></path>
                  <path d="M16.5 28l4.5 3.5 4.5-3.5"></path>
                  <path d="M18.5 32.5l2.5 2 2.5-2"></path>
                  <!-- Restriction Slash across circle from top-right to bottom-left -->
                  <line x1="35.5" y1="8.5" x2="8.5" y2="35.5" stroke-width="1.8"></line>
                </svg>
              </div>
              <span class="fh-vp-badge-label">NO<br>MIDDLEMAN</span>
            </div>

            <!-- Custom Production -->
            <div class="fh-vp-badge">
              <div class="fh-vp-icon-wrap" title="Custom Production">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <!-- Mechanical gear in top-left background -->
                  <path d="M23 4.5h2v2h-2z M23 16.5h2v2h-2z M17 10.5h2v2h-2z M29 10.5h2v2h-2z M18.5 6l1.4 1.4-1.4 1.4-1.4-1.4z M27 14.5l1.4 1.4-1.4 1.4-1.4-1.4z M18.5 15l1.4-1.4 1.4 1.4-1.4 1.4z M27 6.5l1.4-1.4 1.4 1.4-1.4 1.4z" fill="currentColor"></path>
                  <circle cx="24" cy="11.5" r="5.5"></circle>
                  <circle cx="24" cy="11.5" r="2.5"></circle>
                  <!-- Bench plane sole/workpiece line -->
                  <line x1="6" y1="36" x2="38" y2="36" stroke-width="1.6"></line>
                  <!-- Front wooden knob -->
                  <circle cx="11.5" cy="27" r="2.2" fill="var(--color-bg-light)"></circle>
                  <path d="M10.2 29l-1 4h4.6l-1-4" fill="var(--color-bg-light)"></path>
                  <!-- Plane body -->
                  <path d="M14 33c2-2 4.5-3 7.5-3 3 0 5 1 7 3h6c1 0 1.8-.8 1.8-1.8 0-1.8-1.2-3.2-3-3.2h-5" fill="var(--color-bg-light)"></path>
                  <!-- Angled cutting blade / iron -->
                  <line x1="22" y1="20" x2="28" y2="33" stroke-width="2.2"></line>
                  <line x1="23.5" y1="22.5" x2="28.5" y2="32.5" stroke-width="1.4"></line>
                  <!-- Rear tote handle -->
                  <path d="M31.5 28c1-2.5 2.5-4.5 4.5-4.5 2 0 3 1.5 3 4.5 0 2.2-1 3.5-2.5 3.5h-1.5"></path>
                </svg>
              </div>
              <span class="fh-vp-badge-label">CUSTOM<br>PRODUCTION</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SCREENSHOT 2: NEW ARRIVALS -->
    <section class="figma-new-arrivals">
      <div class="site-container">
        <h2 class="figma-section-title-white">New Arrivals</h2>
        
        <div class="figma-products-grid">
          ${newArrivals.length > 0 ? newArrivals.map(p => renderExactCard(p)).join('') : `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px 20px; color: rgba(255,255,255,0.75);">
              <p style="font-size: 1.05rem; margin-bottom: 6px;">New handcrafted arrivals are being prepared by our Dhangadhi workshop.</p>
              <span style="font-size: 0.85rem; opacity: 0.8;">Custom orders and inquiries are welcome directly via our WhatsApp concierge.</span>
            </div>
          `}
        </div>

        <div class="figma-btn-center-wrap">
          <a href="#shop?filter=new-arrivals" class="figma-pill-btn white-outline">
            View All
          </a>
        </div>
      </div>
    </section>

    <!-- SCREENSHOT 3: BEST SELLERS -->
    <section class="figma-best-sellers">
      <div class="site-container">
        <h2 class="figma-section-title-dark">Best Sellers</h2>

        <div class="figma-products-grid">
          ${bestSellers.length > 0 ? bestSellers.map(p => renderExactCard(p)).join('') : `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px 20px; color: var(--color-text-muted);">
              <p style="font-size: 1.05rem; margin-bottom: 6px;">Signature showroom pieces are currently being cataloged.</p>
              <span style="font-size: 0.85rem; color: var(--color-text-subtle);">Explore our workshop inventory or message our team directly.</span>
            </div>
          `}
        </div>

        <div class="figma-btn-center-wrap">
          <a href="#shop?filter=best-sellers" class="figma-pill-btn dark-outline">
            View All
          </a>
        </div>
      </div>
    </section>

    <!-- SCREENSHOT 4: BROWSE BY CATEGORY & A NEW WAY OF LIVING -->
    <section class="figma-category-section">
      <div class="site-container">
        <h2 class="figma-section-title-white">Browse by Category</h2>

        ${Array.isArray(state?.categories) && state.categories.length > 0 ? `
          <div class="figma-category-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
            ${state.categories.map(cat => {
              const name = typeof cat === 'string' ? cat : cat.name;
              const icon = typeof cat === 'object' && cat.icon ? cat.icon : '🏷️';
              return `
                <a href="#shop?category=${encodeURIComponent(name)}" class="figma-cat-card" data-category="${escapeHtml(name)}" style="display: flex; flex-direction: column; justify-content: space-between; padding: 26px; min-height: 140px; border-radius: 16px; background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(255,255,255,0.08); text-decoration: none; color: inherit; transition: transform 0.2s, background 0.2s;">
                  <span class="figma-cat-title" style="font-size: 1.35rem; font-weight: 800; color: #ffffff;">${escapeHtml(name)}</span>
                  <span style="font-size: 2.2rem; align-self: flex-end; opacity: 0.9;">${escapeHtml(icon)}</span>
                </a>
              `;
            }).join('')}
          </div>
        ` : `
          <div style="text-align: center; padding: 36px 20px; background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%); border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);">
            <p style="color: rgba(255,255,255,0.8); font-size: 1rem; margin-bottom: 18px;">
              Explore handcrafted solid wooden furniture crafted for your home and office in Dhangadhi.
            </p>
            <a href="#shop" class="figma-pill-btn" style="background: #c9933f; color: white; display: inline-block; padding: 10px 24px; text-decoration: none; font-weight: 700; border-radius: 30px;">
              Explore Full Catalog
            </a>
          </div>
        `}

        <h2 class="figma-a-new-way">A New Way of Living</h2>
      </div>
    </section>

    <!-- SCREENSHOT 5: OUR REVIEWS -->
    <section class="figma-reviews-section">
      <div class="site-container">
        <h2 class="figma-section-title-dark">Our Reviews</h2>

        <div class="figma-reviews-grid" id="figma-reviews-grid" style="${reviewsData.length === 0 ? 'display: block; text-align: center;' : ''}">
          ${reviewsData.length > 0 ? reviewsData.map((rev, idx) => `
            <div class="figma-review-card ${idx === 1 ? 'featured-review' : ''}" data-review-index="${idx}" data-review-pid="${escapeHtml(rev.productId)}">
              <div>
                <div class="figma-review-header">
                  <div class="figma-avatar-circle">
                    <img src="${escapeHtml(rev.userAvatar)}" alt="${escapeHtml(rev.userName)}">
                  </div>
                  <div>
                    <h4 class="figma-review-name">${escapeHtml(rev.userName)}</h4>
                    <span class="figma-review-product-name" data-nav-pid="${escapeHtml(rev.productId)}" title="View ${escapeHtml(rev.productName)}" style="cursor: pointer; display: block; font-size: 0.82rem; font-weight: 700; color: var(--color-primary); margin-top: 2px;">${escapeHtml(rev.productName)}</span>
                  </div>
                </div>
                <p class="figma-review-quote">
                  "${escapeHtml(rev.comment)}"
                </p>
              </div>
              <div class="figma-review-rating-row">
                <span class="figma-review-stars">${renderStars(rev.rating)}</span>
                <span class="figma-review-score">${rev.rating}/5</span>
              </div>
            </div>
          `).join('') : `
            <div style="padding: 50px 24px; background: #ffffff; border-radius: 20px; border: 1px solid rgba(18, 45, 37, 0.08); max-width: 580px; margin: 0 auto; box-shadow: 0 4px 20px rgba(18, 45, 37, 0.04);">
              <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--color-primary); margin-bottom: 8px;">
                Customer Reviews
              </h3>
              <p style="font-size: 0.9rem; color: var(--color-text-subtle); margin: 0; line-height: 1.5;">
                Top 5-star reviews from verified buyers will appear here once orders are placed and delivered.
              </p>
            </div>
          `}
        </div>

        ${reviewsData.length > 0 ? `
          <!-- Pagination dots from Screenshot 5 -->
          <div class="figma-pagination-dots" id="reviews-pagination-dots">
            <span class="figma-dot" data-index="0"></span>
            <span class="figma-dot active" data-index="1"></span>
            <span class="figma-dot" data-index="2"></span>
          </div>
        ` : ''}
      </div>
    </section>

    <!-- EXACT FIGMA NEWSLETTER & FOOTER (Matching Screenshot) -->
    ${renderFigmaFooter()}
  `;

  // Attach card navigation
  container.querySelectorAll('.figma-product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // If clicking on rating or add button, don't trigger main card navigation
      if (e.target.closest('[data-open-reviews-pid]') || e.target.closest('.home-card-add-btn')) {
        return;
      }
      if (e.target.closest('a') && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button && e.button !== 0))) {
        return;
      }
      e.preventDefault();
      const pid = card.dataset.id;
      window.location.hash = `#product-detail?id=${encodeURIComponent(pid)}`;
    });
  });

  // Open Reviews Modal on Rating Click from Product Cards
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

  // Click on Review product link or review card to open product / reviews
  container.querySelectorAll('[data-nav-pid]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = btn.dataset.navPid;
      window.location.hash = `#product-detail?id=${encodeURIComponent(pid)}`;
    });
  });

  // Add to Cart on Card (+ Button)
  container.querySelectorAll('.home-card-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!state.customerUser && !isCurrentAdmin()) {
        events.emit('toast', { message: '🔒 Please sign in to shop and add items to your cart.', type: 'danger' });
        events.emit('open-customer-auth');
        return;
      }
      const pid = btn.dataset.addPid;
      const prod = state.products.find(p => p.id === pid);
      if (prod) {
        events.emit('add-to-cart', { product: prod, quantity: 1 });
      }
    });
  });

  // Category navigation
  container.querySelectorAll('.figma-cat-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if ((e.target.closest('a') || card.tagName === 'A') && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button && e.button !== 0))) {
        return;
      }
      e.preventDefault();
      const cat = card.dataset.category;
      window.location.hash = `#shop?category=${encodeURIComponent(cat)}`;
    });
  });

  // Reviews Interactive Carousel Dots
  const dots = container.querySelectorAll('.figma-dot');
  const reviewCards = container.querySelectorAll('.figma-review-card');
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const targetIdx = parseInt(dot.dataset.index, 10);
      dots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');

      reviewCards.forEach((rc, i) => {
        if (i === targetIdx) {
          rc.style.transform = 'scale(1.03)';
          rc.style.boxShadow = '0 12px 32px rgba(18, 45, 37, 0.12)';
          rc.style.borderColor = 'var(--color-primary)';
          rc.style.opacity = '1';
        } else {
          rc.style.transform = 'scale(0.97)';
          rc.style.boxShadow = 'none';
          rc.style.borderColor = 'rgba(18, 45, 37, 0.2)';
          rc.style.opacity = '0.75';
        }
      });
    });
  });

  // Newsletter form submission
  const newsletterForm = container.querySelector('#figma-global-newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('input[type="email"]');
      const email = input ? input.value : '';
      if (email) {
        events.emit('toast', { 
          message: `🎉 Thank you for subscribing, ${email}! Your 10% coupon code is HUB10.`, 
          type: 'success' 
        });
        newsletterForm.reset();
      }
    });
  }
}
