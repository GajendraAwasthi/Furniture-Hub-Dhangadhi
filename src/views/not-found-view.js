import { renderFigmaFooter } from '../components/footer.js';
import { resolveCloudImageUrl } from '../utils/cloud-image-resolver.js';

export function renderNotFoundView(container, state, events) {
  const recommended = state.products.slice(0, 4);

  function renderStars(rating = 5) {
    let s = '';
    const r = Math.round(rating);
    for (let i = 0; i < 5; i++) {
      s += `<svg width="13" height="13" viewBox="0 0 24 24" fill="${i < r ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    return s;
  }

  container.innerHTML = `
    <!-- 404 HERO SECTION -->
    <section class="not-found-hero" style="padding: 70px 20px 60px; background: linear-gradient(180deg, #fdfcf9 0%, #f6f3ee 100%); text-align: center; border-bottom: 1px solid rgba(18, 45, 37, 0.08);">
      <div class="site-container" style="max-width: 760px; margin: 0 auto;">
        
        <div class="not-found-badge-wrap" style="margin-bottom: 20px;">
          <span style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; background: rgba(18, 45, 37, 0.06); border: 1px solid rgba(18, 45, 37, 0.12); border-radius: 99px; font-size: 0.85rem; font-weight: 800; color: var(--color-primary); letter-spacing: 0.5px;">
            <span style="font-size: 1rem;">🛋️</span> Error 404 • Missing Piece
          </span>
        </div>

        <h1 style="font-family: var(--font-heading); font-size: clamp(2.4rem, 5vw, 4rem); font-weight: 800; color: var(--color-primary); line-height: 1.15; margin-bottom: 16px;">
          This Space Has Been Rearranged
        </h1>

        <p style="font-size: 1.05rem; color: var(--color-text-subtle); line-height: 1.6; max-width: 580px; margin: 0 auto 32px;">
          The furniture piece or page you're searching for might have been moved, renamed, or is currently taking a rest in our workshop.
        </p>

        <!-- Search Bar in 404 -->
        <form id="not-found-search-form" style="max-width: 480px; margin: 0 auto 32px; display: flex; gap: 10px;">
          <input 
            type="text" 
            id="not-found-search-input" 
            placeholder="Search chairs, dining tables, sofas, vases..." 
            class="form-input" 
            style="flex: 1; padding: 13px 18px; border-radius: 12px; border: 1.5px solid rgba(18, 45, 37, 0.2); font-size: 0.95rem;"
            required
          >
          <button type="submit" class="btn btn-primary" style="padding: 13px 22px; border-radius: 12px; font-weight: 700; white-space: nowrap;">
            Search Catalog
          </button>
        </form>

        <!-- Navigation Buttons -->
        <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
          <a href="/#home" class="btn btn-primary" style="padding: 12px 26px; border-radius: 99px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Return to Home
          </a>
          <a href="/#shop" class="btn btn-outline" style="padding: 12px 26px; border-radius: 99px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; border-color: var(--color-primary); color: var(--color-primary);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Browse All Furniture
          </a>
          <a href="/#faq" class="btn btn-outline" style="padding: 12px 26px; border-radius: 99px; font-weight: 700; border-color: rgba(18, 45, 37, 0.2); color: var(--color-text);">
            Help & FAQs
          </a>
        </div>

      </div>
    </section>

    <!-- POPULAR PIECES RECOMMENDATIONS -->
    <section class="site-container" style="padding: 60px 20px 80px;">
      <div style="text-align: center; margin-bottom: 36px;">
        <h2 style="font-family: var(--font-heading); font-size: 1.8rem; font-weight: 800; color: var(--color-primary); margin-bottom: 8px;">
          Curated Pieces You Might Love Instead
        </h2>
        <p style="color: var(--color-text-subtle); font-size: 0.95rem;">
          Take inspiration from our most popular Nordic designs and artisan creations.
        </p>
      </div>

      <div class="figma-products-grid">
        ${recommended.map(product => `
          <div class="figma-product-card" data-id="${product.id}" style="cursor: pointer;">
            <div class="figma-card-img-wrap">
              <img src="${resolveCloudImageUrl(product.image)}" alt="${product.name}" loading="lazy" onerror="this.src='/images/hero-living-room.png'">
            </div>
            ${product.category ? `<span class="figma-card-category">${product.category}</span>` : ''}
            <h4 class="figma-card-title">${product.name}</h4>
            <div class="figma-card-rating">
              <span class="stars">${renderStars(product.rating || 5)}</span>
              <span class="count">(${product.reviewCount || 8})</span>
            </div>
            <div class="figma-card-price-row" style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px; gap: 8px;">
              <div class="figma-card-price">Rs. ${(product.price || 15000).toLocaleString()}/-</div>
              <a href="/#product-detail?id=${encodeURIComponent(product.id)}" class="btn btn-sm btn-outline" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 8px;">
                View Details
              </a>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- FIGMA FOOTER -->
    ${renderFigmaFooter()}
  `;

  // Search submission on 404
  const searchForm = container.querySelector('#not-found-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = container.querySelector('#not-found-search-input').value.trim();
      if (val) {
        window.location.href = `/#shop?search=${encodeURIComponent(val)}`;
      }
    });
  }

  // Card click navigation
  container.querySelectorAll('.figma-product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() === 'a') return;
      const pid = card.dataset.id;
      window.location.href = `/#product-detail?id=${encodeURIComponent(pid)}`;
    });
  });
}
