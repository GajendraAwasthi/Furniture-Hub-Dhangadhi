import { getProductReviews, getProductRatingSummary, addCustomerReview } from '../services/reviews.js';
import { getCurrentCustomerUser, isCurrentAdmin } from '../services/customer-auth.js';
import { escapeHtml } from '../utils/security.js';

export function openProductReviewsModal(product, events) {
  // Remove any existing reviews modal
  const existing = document.getElementById('product-reviews-modal-wrap');
  if (existing) existing.remove();

  const reviews = getProductReviews(product.id);
  const summary = getProductRatingSummary(product.id);
  const currentUser = getCurrentCustomerUser();

  function renderStars(rating = 5, size = 16) {
    let s = '';
    const r = Math.round(rating);
    for (let i = 0; i < 5; i++) {
      s += `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${i < r ? '#f59e0b' : 'none'}" stroke="${i < r ? '#f59e0b' : '#cbd5e1'}" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    return s;
  }

  const modalHtml = `
    <div class="product-reviews-overlay" id="product-reviews-modal-wrap">
      <div class="product-reviews-modal" role="dialog" aria-modal="true" aria-labelledby="p-rev-title">
        
        <!-- Header -->
        <div class="product-reviews-header">
          <div class="product-reviews-header-info">
            <img src="${product.image}" alt="${product.name}" class="product-reviews-thumb">
            <div>
              <span class="product-reviews-cat">${product.category || 'Furniture'}</span>
              <h3 id="p-rev-title" class="product-reviews-title">${product.name} Reviews</h3>
              <div class="product-reviews-score-line">
                <span class="product-reviews-score">${summary.average}</span>
                <span class="product-reviews-stars">${renderStars(summary.average, 16)}</span>
                <span class="product-reviews-count">(${summary.total} reviews)</span>
              </div>
            </div>
          </div>
          <button class="product-reviews-close-btn" id="close-p-rev-modal" aria-label="Close modal">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Rating Distribution Bar -->
        <div class="product-reviews-dist">
          <div class="product-reviews-bars">
            ${[5, 4, 3, 2, 1].map(stars => {
              const count = summary.distribution[stars] || 0;
              const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
              return `
                <div class="dist-row">
                  <span class="dist-label">${stars} ★</span>
                  <div class="dist-bar-track">
                    <div class="dist-bar-fill" style="width: ${pct}%"></div>
                  </div>
                  <span class="dist-pct">${pct}%</span>
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="product-reviews-cta-box">
            <button class="write-review-toggle-btn" id="toggle-write-review-btn">
              ✍️ Write a Review
            </button>
          </div>
        </div>

        <!-- Write Review Collapsible Form -->
        <div class="write-review-container" id="write-review-container" style="display: none;">
          <form id="submit-customer-review-form" class="customer-review-form">
            <div class="review-form-title-row">
              <h4>Share Your Experience with ${product.name}</h4>
              <span class="review-form-author">Posting as <strong>${currentUser ? (currentUser.name || currentUser.email) : 'Guest (Sign in required)'}</strong></span>
            </div>
            
            <div class="rating-picker-row">
              <label>Your Rating:</label>
              <div class="star-rating-picker" id="star-picker">
                ${[1, 2, 3, 4, 5].map(v => `
                  <button type="button" class="star-pick-btn ${v === 5 ? 'selected' : ''}" data-val="${v}" title="${v} Star${v > 1 ? 's' : ''}">
                    ★
                  </button>
                `).join('')}
              </div>
              <input type="hidden" id="selected-star-val" value="5">
            </div>

            <div class="review-form-inputs">
              <input type="text" id="review-input-title" placeholder="Review headline (e.g. Ergonomic perfection, beautifully made)" class="review-text-input" required>
              <textarea id="review-input-comment" rows="3" placeholder="Describe the materials, comfort, delivery, or how it fits in your space..." class="review-textarea" required></textarea>
            </div>

            <div class="review-form-actions">
              <button type="button" class="review-cancel-btn" id="cancel-write-review-btn">Cancel</button>
              <button type="submit" class="review-submit-btn">Submit Review</button>
            </div>
          </form>
        </div>

        <!-- Reviews List -->
        <div class="product-reviews-list" id="p-reviews-list-container">
          ${reviews.map(rev => `
            <div class="product-review-item">
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
                <div class="rev-item-stars">
                  ${renderStars(rev.rating, 14)}
                </div>
              </div>
              <p class="rev-item-body">${escapeHtml(rev.comment)}</p>
            </div>
          `).join('')}
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modalWrap = document.getElementById('product-reviews-modal-wrap');
  const closeBtn = document.getElementById('close-p-rev-modal');
  const toggleBtn = document.getElementById('toggle-write-review-btn');
  const writeContainer = document.getElementById('write-review-container');
  const cancelBtn = document.getElementById('cancel-write-review-btn');
  const form = document.getElementById('submit-customer-review-form');
  const starPicker = document.getElementById('star-picker');
  const starInput = document.getElementById('selected-star-val');

  // Close handlers
  function closeModal() {
    if (modalWrap) modalWrap.remove();
    document.removeEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') closeModal();
  }

  closeBtn.addEventListener('click', closeModal);
  modalWrap.addEventListener('click', (e) => {
    if (e.target === modalWrap) closeModal();
  });
  document.addEventListener('keydown', handleKeydown);

  // Toggle write review
  toggleBtn.addEventListener('click', () => {
    const user = getCurrentCustomerUser();
    if (!user && !isCurrentAdmin()) {
      closeModal();
      if (events) {
        events.emit('toast', { message: '🔒 Please sign in to write a verified customer review.', type: 'danger' });
        events.emit('open-customer-auth');
      }
      return;
    }

    if (writeContainer.style.display === 'none') {
      writeContainer.style.display = 'block';
      writeContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      writeContainer.style.display = 'none';
    }
  });

  cancelBtn.addEventListener('click', () => {
    writeContainer.style.display = 'none';
  });

  // Star Picker
  const starBtns = starPicker.querySelectorAll('.star-pick-btn');
  starBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.dataset.val, 10);
      starInput.value = val;
      starBtns.forEach((b, idx) => {
        if (idx < val) {
          b.classList.add('selected');
        } else {
          b.classList.remove('selected');
        }
      });
    });
  });

  // Submit Review
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = getCurrentCustomerUser();
    if (!user && !isCurrentAdmin()) {
      closeModal();
      if (events) {
        events.emit('toast', { message: '🔒 Please sign in to submit a review.', type: 'danger' });
        events.emit('open-customer-auth');
      }
      return;
    }

    const title = document.getElementById('review-input-title').value.trim();
    const comment = document.getElementById('review-input-comment').value.trim();
    const rating = parseInt(starInput.value, 10) || 5;

    const newRev = addCustomerReview({
      productId: product.id,
      productName: product.name,
      userName: user ? (user.name || user.email.split('@')[0]) : 'Customer',
      userAvatar: user ? user.avatar : '/images/social-user.png',
      rating,
      title,
      comment,
      location: 'Kathmandu, Nepal'
    });

    if (events) {
      events.emit('toast', { message: '🌟 Thank you! Your verified review has been published.', type: 'success' });
    }

    // Refresh modal with the new review
    closeModal();
    openProductReviewsModal(product, events);
  });
}
