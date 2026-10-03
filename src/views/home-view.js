import { renderFigmaFooter } from '../components/footer.js';
import { isCurrentAdmin } from '../services/customer-auth.js';
import { getTopReviews } from '../services/reviews.js';
import { openProductReviewsModal } from '../components/product-reviews-modal.js';
import { resolveCloudImageUrl } from '../utils/cloud-image-resolver.js';
import { escapeHtml } from '../utils/security.js';
import { DEFAULT_HERO_BANNERS } from '../services/supabase.js';

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
  const banners = (Array.isArray(state?.heroBanners) && state.heroBanners.length > 0)
    ? state.heroBanners
    : DEFAULT_HERO_BANNERS;

  container.innerHTML = `
    <!-- SCREENSHOT 1: HERO SECTION -->
    <section class="figma-hero">
      <div class="figma-hero-content">
        <h1 class="figma-hero-title">
          Find the Right Furniture <br>that Matches You and Your Home
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
      </div>

      <!-- HERO BANNER SLIDESHOW (Fits inside the exact bottom box, edge-to-edge) -->
      ${(Array.isArray(banners) && banners.length > 0) ? `
      <div class="fh-hero-slideshow" id="hero-slideshow" aria-label="Featured Furniture Collections" role="region">
        <div class="fh-slideshow-viewport">
          <div class="fh-slideshow-track" id="hero-slideshow-track">
            ${banners.map((b, i) => `
              <div class="fh-slide" data-slide="${i}">
                <img src="${escapeHtml(b.url)}" alt="${escapeHtml(b.alt || 'Furniture Hub Dhangadhi')}" class="fh-slide-img" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async" draggable="false">
              </div>
            `).join('')}
          </div>
          ${banners.length > 1 ? `
          <div class="fh-slideshow-dots" id="hero-slideshow-dots" role="tablist" aria-label="Slide indicators">
            ${banners.map((_, i) => `
              <button class="fh-slideshow-dot ${i === 0 ? 'active' : ''}" data-slide-index="${i}" aria-label="Go to slide ${i + 1}" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}"></button>
            `).join('')}
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}
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

  // Hero Banner Slideshow (Automatic 5-second smooth scroll transition with dots indicator)
  const slideshowEl = container.querySelector('#hero-slideshow');
  if (slideshowEl) {
    const track = slideshowEl.querySelector('#hero-slideshow-track');
    const dots = slideshowEl.querySelectorAll('.fh-slideshow-dot');
    let currentSlide = 0;
    const totalSlides = track?.children.length || 0;
    let autoTimer = null;

    function updateDots(activeIdx) {
      dots.forEach((dot, idx) => {
        const isActive = idx === activeIdx;
        dot.classList.toggle('active', isActive);
        dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }

    function goToSlide(idx) {
      if (totalSlides <= 1) return;
      currentSlide = ((idx % totalSlides) + totalSlides) % totalSlides;
      if (track) {
        track.style.transform = `translateX(-${currentSlide * 100}%)`;
      }
      updateDots(currentSlide);
    }

    function startTimer() {
      if (totalSlides > 1) {
        if (autoTimer) clearInterval(autoTimer);
        autoTimer = setInterval(() => goToSlide(currentSlide + 1), 5000);
      }
    }

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        goToSlide(idx);
        startTimer(); // Reset the 5s interval on user interaction
      });
    });

    startTimer();

    // Cleanup on navigation
    const observer = new MutationObserver(() => {
      if (!document.contains(slideshowEl)) {
        if (autoTimer) clearInterval(autoTimer);
        observer.disconnect();
      }
    });
    observer.observe(container, { childList: true });
  }
}
