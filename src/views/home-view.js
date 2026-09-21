import { renderFigmaFooter } from '../components/footer.js';
import { isCurrentAdmin } from '../services/customer-auth.js';
import { getTopReviews } from '../services/reviews.js';
import { openProductReviewsModal } from '../components/product-reviews-modal.js';

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
      <div class="figma-product-card" data-id="${product.id}">
        <div class="figma-card-img-wrap">
          <img src="${product.image || '/images/hero-living-room.png'}" alt="${product.name}" loading="lazy" onerror="this.src='/images/hero-living-room.png'">
        </div>
        <span class="figma-card-category">${product.category || 'Decorations'}</span>
        <h4 class="figma-card-title">${product.name}</h4>
        <div class="figma-card-rating figma-card-rating-interactive" data-open-reviews-pid="${product.id}" title="View verified customer reviews">
          <span class="stars">${renderStars(product.rating || 5)}</span>
          <span class="count">(${product.reviewCount || 8} reviews)</span>
        </div>
        <div class="figma-card-price-row" style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px; gap: 8px;">
          <div class="figma-card-price">Rs. ${(product.price || 15000).toLocaleString()}/-</div>
          <button class="card-add-btn home-card-add-btn" data-add-pid="${product.id}" title="Add to Cart" aria-label="Add ${product.name} to cart">
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
          <img src="/images/hero-living-room.png" alt="Sofa and Side Table Living Composition">
        </div>
        <div class="figma-hero-btn-wrap">
          <a href="#shop" class="figma-pill-btn dark-outline" id="hero-shop-now-btn">
            Shop Now
          </a>
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

        <div class="figma-category-grid">
          <!-- Row 1: Seatings & Surfaces -->
          <div class="figma-cat-row">
            <div class="figma-cat-card w-small" data-category="Seatings" style="display: flex; flex-direction: column; justify-content: space-between; padding: 26px; background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);">
              <span class="figma-cat-title" style="font-size: 1.45rem; font-weight: 800;">Seatings</span>
              <span style="font-size: 2.5rem; align-self: flex-end; opacity: 0.85;">🪑</span>
            </div>
            <div class="figma-cat-card w-large" data-category="Surfaces" style="display: flex; flex-direction: column; justify-content: space-between; padding: 26px; background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);">
              <span class="figma-cat-title" style="font-size: 1.45rem; font-weight: 800;">Surfaces</span>
              <span style="font-size: 2.5rem; align-self: flex-end; opacity: 0.85;">🪵</span>
            </div>
          </div>

          <!-- Row 2: Decorations & Greens -->
          <div class="figma-cat-row">
            <div class="figma-cat-card w-half" data-category="Decorations" style="display: flex; flex-direction: column; justify-content: space-between; padding: 26px; background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);">
              <span class="figma-cat-title" style="font-size: 1.45rem; font-weight: 800;">Decorations</span>
              <span style="font-size: 2.5rem; align-self: flex-end; opacity: 0.85;">✨</span>
            </div>
            <div class="figma-cat-card w-half" data-category="Greens" style="display: flex; flex-direction: column; justify-content: space-between; padding: 26px; background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);">
              <span class="figma-cat-title" style="font-size: 1.45rem; font-weight: 800;">Greens</span>
              <span style="font-size: 2.5rem; align-self: flex-end; opacity: 0.85;">🌿</span>
            </div>
          </div>
        </div>

        <h2 class="figma-a-new-way">A New Way of Living</h2>
      </div>
    </section>

    <!-- SCREENSHOT 5: OUR REVIEWS -->
    <section class="figma-reviews-section">
      <div class="site-container">
        <h2 class="figma-section-title-dark">Our Reviews</h2>

        <div class="figma-reviews-grid" id="figma-reviews-grid">
          ${reviewsData.map((rev, idx) => `
            <div class="figma-review-card ${idx === 1 ? 'featured-review' : ''}" data-review-index="${idx}" data-review-pid="${rev.productId}">
              <div>
                <div class="figma-review-header">
                  <div class="figma-avatar-circle">
                    <img src="${rev.userAvatar}" alt="${rev.userName}">
                  </div>
                  <div>
                    <h4 class="figma-review-name">${rev.userName}</h4>
                    <span class="figma-review-product-name" data-nav-pid="${rev.productId}" title="View ${rev.productName}" style="cursor: pointer; display: block; font-size: 0.82rem; font-weight: 700; color: var(--color-primary); margin-top: 2px;">${rev.productName}</span>
                  </div>
                </div>
                <p class="figma-review-quote">
                  "${rev.comment}"
                </p>
              </div>
              <div class="figma-review-rating-row">
                <span class="figma-review-stars">${renderStars(rev.rating)}</span>
                <span class="figma-review-score">${rev.rating}/5</span>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Pagination dots from Screenshot 5 -->
        <div class="figma-pagination-dots" id="reviews-pagination-dots">
          <span class="figma-dot" data-index="0"></span>
          <span class="figma-dot active" data-index="1"></span>
          <span class="figma-dot" data-index="2"></span>
        </div>
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
    card.addEventListener('click', () => {
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
