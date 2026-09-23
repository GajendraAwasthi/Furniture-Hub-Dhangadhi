import { renderFigmaFooter } from '../components/footer.js';
import { isCurrentAdmin, getCurrentCustomerUser } from '../services/customer-auth.js';
import { getProductReviews, getProductRatingSummary, addCustomerReview, hasCustomerPurchasedProduct } from '../services/reviews.js';
import { openProductReviewsModal } from '../components/product-reviews-modal.js';
import { escapeHtml } from '../utils/security.js';
import { resolveCloudImageUrl } from '../utils/cloud-image-resolver.js';

export function renderProductDetailView(container, state, events, params) {
  const productId = params.get('id') || '';
  const product = state.products.find(p => p.id === productId) || state.products[0];

  if (!product) {
    container.innerHTML = `
      <div class="container" style="padding: 100px 20px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 48px 32px; border: 1px solid rgba(18,45,37,0.1); box-shadow: 0 8px 30px rgba(18,45,37,0.06);">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 16px auto; color: var(--color-text-subtle);">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h2 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 10px; color: var(--color-primary);">Piece Not Available</h2>
          <p style="color: var(--color-text-muted); font-size: 0.95rem; line-height: 1.6; margin-bottom: 24px;">
            This furniture piece is currently unavailable or has not yet been uploaded to our catalog.
          </p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <a href="#shop" class="btn btn-primary" style="padding: 12px 24px; font-weight: 700; border-radius: 12px;">Browse Catalog</a>
            <a href="#home" class="btn btn-secondary" style="padding: 12px 24px; font-weight: 700; border-radius: 12px;">Back to Home</a>
          </div>
        </div>
      </div>
      <div id="figma-footer-container"></div>
    `;
    const footerContainer = container.querySelector('#figma-footer-container');
    if (footerContainer) renderFigmaFooter(footerContainer);
    return;
  }

  let selectedColor = product.colors && product.colors.length > 0 ? product.colors[0].name : '';
  const rawGallery = Array.isArray(product.gallery) && product.gallery.length > 0 
    ? product.gallery 
    : (product.image ? [product.image] : ['/images/hero-living-room.png']);
  const gallery = rawGallery.map(img => resolveCloudImageUrl(img));
  let selectedImage = gallery[0] || '/images/hero-living-room.png';
  let quantity = 1;

  function formatPrice(num) {
    return 'NPR ' + num.toLocaleString() + ' /-';
  }

  function renderStars(rating) {
    const full = Math.floor(rating);
    let s = '';
    for (let i = 0; i < full; i++) {
      s += `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    return s;
  }

  const summary = getProductRatingSummary(product.id);
  const productReviews = getProductReviews(product.id);
  const related = state.products.filter(p => p.id !== product.id).slice(0, 4);

  container.innerHTML = `
    <div class="container" style="padding-top: 20px;">
      <!-- Breadcrumb (Directly from Figma: Home > Shop Now > Category > Product) -->
      <nav class="breadcrumbs">
        <a href="#home">Home</a>
        <span class="separator">&gt;</span>
        <a href="#shop">Shop Now</a>
        <span class="separator">&gt;</span>
        <a href="#shop?category=${encodeURIComponent(product.category || '')}">${product.category || 'Collection'}</a>
        <span class="separator">&gt;</span>
        <span>${product.name}</span>
      </nav>

      <!-- Main Product Detail Grid (From Figma Product Detail frame) -->
      <div class="product-detail-grid">
        <!-- Gallery Column -->
        <div class="detail-gallery">
          <div class="detail-main-img" id="detail-main-img-wrap" style="position: relative; cursor: zoom-in;" title="Click to view full-resolution image">
            <img id="detail-active-img" src="${selectedImage}" alt="${product.name} — Furniture Hub Dhangadhi" width="600" height="520" fetchpriority="high" decoding="async" onerror="this.src='/images/hero-living-room.png'">
            <span style="position: absolute; bottom: 12px; right: 12px; background: rgba(18,45,37,0.8); color: #ffffff; font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 8px; backdrop-filter: blur(4px); display: flex; align-items: center; gap: 4px; pointer-events: none;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
              <span>HQ Zoom</span>
            </span>
          </div>

          <!-- Thumbnails -->
          <div class="detail-thumbnails" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px;">
            ${gallery.map((imgUrl, idx) => `
              <div class="detail-thumb ${imgUrl === selectedImage ? 'active' : ''}" data-img-url="${imgUrl}" style="cursor: pointer; flex-shrink: 0;" title="View angle ${idx + 1}">
                <img src="${imgUrl}" alt="${product.name} thumbnail angle ${idx + 1}" width="80" height="80" loading="lazy" decoding="async" onerror="this.src='/images/hero-living-room.png'">
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Product Information Column -->
        <div class="detail-info">
          <div>
            <span class="badge-tag" style="margin-bottom: 8px;">${product.category}</span>
            <h1 class="detail-title">${product.name}</h1>
            <div class="product-rating product-rating-interactive" id="detail-top-rating-trigger" style="margin-top: 10px; cursor: pointer;" title="Jump to customer reviews">
              <span class="stars">${renderStars(summary.average || product.rating)}</span>
              <span class="rating-count" style="font-size: 0.9rem;">${summary.average || product.rating} (${summary.total || product.reviewCount} Reviews) ▾</span>
            </div>
          </div>

          <!-- Price Display (Figma: NPR 15,000 /-) -->
          <div class="detail-price-box">
            <span class="detail-current-price">${formatPrice(product.price)}</span>
            ${product.originalPrice ? `<span class="detail-original-price">NPR ${product.originalPrice.toLocaleString()} /-</span>` : ''}
            ${product.originalPrice ? `
              <span class="badge-tag badge-sale">
                Save NPR ${(product.originalPrice - product.price).toLocaleString()}
              </span>
            ` : ''}
          </div>

          <!-- Description -->
          <p class="detail-desc">
            ${product.description}
          </p>

          <!-- Specifications Card (From Figma Product Detail: Materials, Dimensions, Weight) -->
          <div class="specs-card">
            <div style="font-weight: 700; font-size: 1rem; color: var(--color-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Specifications & Details</span>
            </div>
            <div class="spec-row">
              <span class="spec-label">Materials :</span>
              <span class="spec-val">${product.materials || 'PU Leather, Metal Frame'}</span>
            </div>
            <div class="spec-row">
              <span class="spec-label">Dimensions :</span>
              <span class="spec-val">${product.dimensions || '85cm, 65cm, 45cm'}</span>
            </div>
            <div class="spec-row">
              <span class="spec-label">Weight :</span>
              <span class="spec-val">${product.weight || '22kg'}</span>
            </div>
            <div class="spec-row">
              <span class="spec-label">Warranty :</span>
              <span class="spec-val">3 Years Manufacturer Warranty</span>
            </div>
          </div>

          <!-- Color Selector (From Figma: Color : Snow White / Red) -->
          <div class="selector-group">
            <label class="selector-label">
              Color : <span id="detail-selected-color-label" style="font-weight: 500; color: var(--color-text-muted);">${selectedColor}</span>
            </label>
            <div class="color-pills" id="detail-color-pills">
              ${(product.colors || []).map(col => `
                <button class="color-pill-btn ${col.name === selectedColor ? 'active' : ''}" data-color-name="${col.name}">
                  <span class="color-dot" style="background-color: ${col.hex};"></span>
                  <span>${col.name}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Quantity Selector (From Figma: Quantity: 1) -->
          <div class="selector-group">
            <label class="selector-label">Quantity :</label>
            <div class="stepper">
              <button class="stepper-btn" id="qty-minus" aria-label="Decrease quantity">−</button>
              <input type="text" class="stepper-input" id="qty-input" value="1" readonly>
              <button class="stepper-btn" id="qty-plus" aria-label="Increase quantity">+</button>
            </div>
          </div>

          <!-- Action Buttons (Add to Cart via + with Auth Guard) -->
          <div class="detail-actions">
            ${state.customerUser ? `
              <button class="btn btn-primary" id="detail-add-to-cart-btn" style="width: 100%; justify-content: center; padding: 15px 28px; font-size: 1.05rem; font-weight: 700; border-radius: 12px; display: inline-flex; align-items: center; gap: 10px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <span>+ Add to Cart</span>
              </button>
            ` : `
              <button class="btn btn-primary" id="detail-add-to-cart-btn" style="width: 100%; justify-content: center; padding: 15px 28px; font-size: 1.05rem; font-weight: 700; border-radius: 12px; display: inline-flex; align-items: center; gap: 10px; background: linear-gradient(135deg, #122d25 0%, #1c4538 100%);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>Sign In to Shop / Add to Cart</span>
              </button>
            `}
          </div>
        </div>
      </div>

      <!-- Customer Reviews & Ratings Section -->
      <section class="detail-reviews-section" id="detail-reviews-section" style="border-top: 1px solid var(--color-border); padding-top: 50px; margin-top: 50px;">
        <div class="section-header" style="margin-bottom: 28px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div>
            <h2 class="heading-section">Customer Reviews & Ratings</h2>
            <p class="text-subtitle">Reviews from customers who purchased ${product.name}</p>
          </div>
          <button type="button" class="btn btn-primary" id="detail-write-review-btn" style="padding: 10px 20px; font-weight: 700; border-radius: 10px;">
            ✍️ Write a Review
          </button>
        </div>

        <!-- Rating Summary Card -->
        <div class="detail-rating-summary-card">
          <div class="summary-score-column">
            <div class="big-score">${summary.average}</div>
            <div class="score-stars">${renderStars(summary.average)}</div>
            <div class="score-sub">Based on ${summary.total} reviews</div>
          </div>

          <div class="summary-bars-column">
            ${[5, 4, 3, 2, 1].map(stars => {
              const count = summary.distribution[stars] || 0;
              const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
              return `
                <div class="dist-row">
                  <span class="dist-label">${stars} Stars</span>
                  <div class="dist-bar-track">
                    <div class="dist-bar-fill" style="width: ${pct}%"></div>
                  </div>
                  <span class="dist-pct">${pct}% (${count})</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Collapsible Write Review Form -->
        <div class="detail-write-review-box" id="detail-write-review-box" style="display: none;">
          <form id="detail-review-form" class="customer-review-form">
            <h4 style="font-size: 1.15rem; color: var(--color-primary); margin-bottom: 6px;">Share Your Review</h4>
            <p style="font-size: 0.85rem; color: var(--color-text-subtle); margin-bottom: 16px;">Your review helps other interior lovers make confident decisions.</p>
            
            <div class="rating-picker-row" style="margin-bottom: 16px;">
              <label style="font-weight: 700; font-size: 0.9rem;">Your Rating:</label>
              <div class="star-rating-picker" id="detail-star-picker">
                ${[1, 2, 3, 4, 5].map(v => `
                  <button type="button" class="star-pick-btn ${v === 5 ? 'selected' : ''}" data-val="${v}">★</button>
                `).join('')}
              </div>
              <input type="hidden" id="detail-selected-star" value="5">
            </div>

            <div class="review-form-inputs">
              <input type="text" id="detail-review-title" placeholder="Review headline (e.g. Masterful ergonomics, top-tier build)" class="review-text-input" required>
              <textarea id="detail-review-comment" rows="3" placeholder="Describe the materials, comfort, delivery experience, or styling in your room..." class="review-textarea" required></textarea>
            </div>

            <div class="review-form-actions">
              <button type="button" class="review-cancel-btn" id="detail-cancel-review-btn">Cancel</button>
              <button type="submit" class="review-submit-btn">Publish Review</button>
            </div>
          </form>
        </div>

        <!-- Reviews Grid -->
        <div class="detail-reviews-grid">
          ${productReviews.map(rev => `
            <div class="detail-review-card">
              <div class="rev-item-top">
                <div class="rev-user-meta">
                  <img src="${rev.userAvatar || '/images/social-user.png'}" alt="${rev.userName}" class="rev-user-avatar">
                  <div>
                    <div class="rev-user-name-row">
                      <h4 class="rev-user-name">${escapeHtml(rev.userName)}</h4>
                    </div>
                    <span class="rev-meta-sub" style="font-weight: 700; color: var(--color-primary); font-size: 0.78rem;">${escapeHtml(rev.productName || product.name)}</span>
                  </div>
                </div>
                <div class="rev-item-stars">${renderStars(rev.rating)}</div>
              </div>
              <p class="rev-item-body">${escapeHtml(rev.comment)}</p>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- You May Also Like Section (From Figma: You May Also Like) -->
      <section class="products-section" style="border-top: 1px solid var(--color-border); padding-top: 60px;">
        <div class="section-header">
          <div>
            <h2 class="heading-section">You May Also Like</h2>
            <p class="text-subtitle">Pieces coordinated to complement this style seamlessly</p>
          </div>
        </div>

        <div class="product-grid">
          ${related.map(p => `
            <div class="product-card" data-id="${p.id}">
              <div class="product-media">
                <span class="product-badge-overlay badge-tag">${p.category}</span>
                <img src="${resolveCloudImageUrl(p.image)}" alt="${p.name}" class="product-navigate-trigger" data-id="${p.id}" onerror="this.src='/images/hero-living-room.png'">
              </div>
              <div class="product-info">
                <span class="product-category-label">${p.category}</span>
                <h3 class="product-title product-navigate-trigger" data-id="${p.id}">${p.name}</h3>
                <div class="product-rating product-rating-interactive" data-open-reviews-pid="${p.id}" title="View ${p.name} reviews">
                  <span class="stars">${renderStars(p.rating)}</span>
                  <span class="rating-count">(${p.reviewCount} reviews)</span>
                </div>
                <div class="product-price-row">
                  <span class="price-current">Rs. ${p.price.toLocaleString()}/-</span>
                  <button class="card-add-btn" data-add-id="${p.id}" title="Add to Cart">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    </div>

    <!-- FULLSCREEN HIGH-RESOLUTION LIGHTBOX MODAL -->
    <div id="product-lightbox-modal" style="display: none; position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.92); backdrop-filter: blur(8px); align-items: center; justify-content: center; padding: 20px;">
      <button type="button" id="btn-close-lightbox" style="position: absolute; top: 20px; right: 24px; background: rgba(255,255,255,0.15); border: none; color: #ffffff; width: 44px; height: 44px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10001; transition: background 0.2s ease;">
        ✕
      </button>
      
      <div style="max-width: 90vw; max-height: 88vh; position: relative; display: flex; flex-direction: column; align-items: center;">
        <img id="lightbox-full-img" src="${selectedImage}" alt="${product.name}" style="max-width: 100%; max-height: 82vh; object-fit: contain; border-radius: 12px; box-shadow: 0 16px 48px rgba(0,0,0,0.5);">
        <div style="color: #ffffff; margin-top: 14px; font-weight: 700; font-size: 0.95rem; letter-spacing: 0.5px; opacity: 0.9;">
          ${product.name} • High Resolution Studio View
        </div>
      </div>
    </div>

    <!-- EXACT FIGMA NEWSLETTER & FOOTER (Matching Screenshot) -->
    ${renderFigmaFooter()}
  `;

  // Gallery thumbnail switching & Lightbox wiring
  const mainImg = container.querySelector('#detail-active-img');
  const mainImgWrap = container.querySelector('#detail-main-img-wrap');
  const lightboxModal = container.querySelector('#product-lightbox-modal');
  const lightboxImg = container.querySelector('#lightbox-full-img');
  const closeLightboxBtn = container.querySelector('#btn-close-lightbox');

  container.querySelectorAll('.detail-thumb[data-img-url]').forEach(thumb => {
    thumb.addEventListener('click', () => {
      container.querySelectorAll('.detail-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const url = thumb.dataset.imgUrl;
      selectedImage = url;
      if (mainImg) mainImg.src = url;
      if (lightboxImg) lightboxImg.src = url;
    });
  });

  if (mainImgWrap && lightboxModal && lightboxImg) {
    mainImgWrap.addEventListener('click', () => {
      lightboxImg.src = selectedImage;
      lightboxModal.style.display = 'flex';
    });
  }

  if (closeLightboxBtn && lightboxModal) {
    closeLightboxBtn.addEventListener('click', () => {
      lightboxModal.style.display = 'none';
    });
  }

  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) {
        lightboxModal.style.display = 'none';
      }
    });
  }

  // Color pill selection
  const colorLabel = container.querySelector('#detail-selected-color-label');

  container.querySelectorAll('.color-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.color-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = btn.dataset.colorName;
      if (colorLabel) colorLabel.textContent = selectedColor;
    });
  });

  // Quantity stepper
  const qtyInput = container.querySelector('#qty-input');
  const minusBtn = container.querySelector('#qty-minus');
  const plusBtn = container.querySelector('#qty-plus');

  if (minusBtn && plusBtn && qtyInput) {
    minusBtn.addEventListener('click', () => {
      if (quantity > 1) {
        quantity--;
        qtyInput.value = quantity;
      }
    });
    plusBtn.addEventListener('click', () => {
      quantity++;
      qtyInput.value = quantity;
    });
  }

  // Add to cart (+ Button with Auth Guard)
  const addToCartBtn = container.querySelector('#detail-add-to-cart-btn');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      if (!state.customerUser && !isCurrentAdmin()) {
        events.emit('toast', { message: '🔒 Please sign in to shop and add items to your cart.', type: 'danger' });
        events.emit('open-customer-auth');
        return;
      }
      events.emit('add-to-cart', {
        product,
        quantity,
        color: selectedColor
      });
    });
  }

  // Scroll to reviews when clicking top rating
  const topRatingTrigger = container.querySelector('#detail-top-rating-trigger');
  if (topRatingTrigger) {
    topRatingTrigger.addEventListener('click', () => {
      const target = container.querySelector('#detail-reviews-section');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Toggle write review form
  const writeReviewBtn = container.querySelector('#detail-write-review-btn');
  const writeReviewBox = container.querySelector('#detail-write-review-box');
  const cancelReviewBtn = container.querySelector('#detail-cancel-review-btn');

  if (writeReviewBtn && writeReviewBox) {
    writeReviewBtn.addEventListener('click', () => {
      const user = getCurrentCustomerUser();
      if (!user && !isCurrentAdmin()) {
        events.emit('toast', { message: '🔒 Please sign in to write a verified customer review.', type: 'danger' });
        events.emit('open-customer-auth');
        return;
      }
      if (writeReviewBox.style.display === 'none') {
        writeReviewBox.style.display = 'block';
        writeReviewBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        writeReviewBox.style.display = 'none';
      }
    });
  }

  if (cancelReviewBtn && writeReviewBox) {
    cancelReviewBtn.addEventListener('click', () => {
      writeReviewBox.style.display = 'none';
    });
  }

  // Detail Star Picker
  const starPicker = container.querySelector('#detail-star-picker');
  const starHidden = container.querySelector('#detail-selected-star');
  if (starPicker && starHidden) {
    const btns = starPicker.querySelectorAll('.star-pick-btn');
    btns.forEach(b => {
      b.addEventListener('click', () => {
        const val = parseInt(b.dataset.val, 10);
        starHidden.value = val;
        btns.forEach((btn, idx) => {
          if (idx < val) {
            btn.classList.add('selected');
          } else {
            btn.classList.remove('selected');
          }
        });
      });
    });
  }

  // Detail Review Form Submit
  const reviewForm = container.querySelector('#detail-review-form');
  if (reviewForm) {
    reviewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = getCurrentCustomerUser();
      if (!user && !isCurrentAdmin()) {
        events.emit('toast', { message: 'Please sign in to publish a review.', type: 'danger' });
        events.emit('open-customer-auth');
        return;
      }

      if (user && !hasCustomerPurchasedProduct(user.id, product.id) && !isCurrentAdmin()) {
        events.emit('toast', { 
          message: 'Only verified buyers who have purchased this piece can submit a review.', 
          type: 'danger' 
        });
        return;
      }

      const title = container.querySelector('#detail-review-title').value.trim();
      const comment = container.querySelector('#detail-review-comment').value.trim();
      const rating = parseInt(starHidden ? starHidden.value : '5', 10) || 5;

      try {
        addCustomerReview({
          productId: product.id,
          productName: product.name,
          userId: user ? user.id : null,
          userName: user ? (user.name || user.email.split('@')[0]) : 'Verified Buyer',
          userAvatar: user ? user.avatar : '/images/social-user.png',
          rating,
          title,
          comment,
          location: (user?.city || 'Dhangadhi') + ', Nepal'
        });

        events.emit('toast', { message: 'Thank you! Your verified review has been published.', type: 'success' });
        // Re-render product detail view with newly added review
        renderProductDetailView(container, state, events, params);
      } catch (err) {
        events.emit('toast', { message: err.message, type: 'danger' });
      }
    });
  }

  // Open Reviews Modal on Related Products Click
  container.querySelectorAll('[data-open-reviews-pid]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = btn.dataset.openReviewsPid;
      const relProd = state.products.find(p => p.id === pid);
      if (relProd) {
        openProductReviewsModal(relProd, events);
      }
    });
  });

  // Related product links
  container.querySelectorAll('.product-navigate-trigger').forEach(el => {
    el.addEventListener('click', () => {
      const pid = el.dataset.id;
      window.location.hash = `#product-detail?id=${encodeURIComponent(pid)}`;
    });
  });

  container.querySelectorAll('.card-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!state.customerUser && !isCurrentAdmin()) {
        events.emit('toast', { message: '🔒 Please sign in to shop and add items to your cart.', type: 'danger' });
        events.emit('open-customer-auth');
        return;
      }
      const pid = btn.dataset.addId;
      const relProduct = state.products.find(p => p.id === pid);
      if (relProduct) {
        events.emit('add-to-cart', { product: relProduct, quantity: 1 });
      }
    });
  });
}
