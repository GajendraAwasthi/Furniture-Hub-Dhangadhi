export function renderFigmaFooter() {
  return `
    <div class="figma-footer-wrapper">
      <!-- Newsletter Box from Figma Screenshot -->
      <div class="figma-newsletter-container">
        <div class="figma-newsletter-card">
          <h3 class="figma-newsletter-heading">
            Stay upto Date about<br>our Latest Offers
          </h3>
          <form class="figma-newsletter-actions" id="figma-global-newsletter-form">
            <div class="figma-email-input-wrap">
              <svg width="24" height="20" viewBox="0 0 24 20" fill="none" stroke="#122d25" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="1" width="22" height="18" rx="3.5"></rect>
                <polyline points="2 3 12 11 22 3"></polyline>
              </svg>
              <input type="email" class="figma-email-input" placeholder="Enter Your Email Address" required>
            </div>
            <button type="submit" class="figma-subscribe-btn">
              Subscribe to our Newsletter
            </button>
          </form>
        </div>
      </div>

      <!-- Main Footer from Figma Screenshot -->
      <div class="figma-footer-content">
        <div class="figma-footer-main-grid">
          <!-- Column 1: Brand & Socials -->
          <div class="figma-footer-about">
            <h3>Furniture Hub Dhangadhi</h3>
            <p>
              Meticulously curated furniture in Dhangadhi, Kailali. Crafted to bring out your individuality and timeless elegance across Sudurpashchim Province and Nepal.
            </p>
            <div class="figma-social-row">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" class="figma-social-circle" title="Facebook">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" class="figma-social-circle" title="Instagram">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" class="figma-social-circle" title="TikTok">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-1.42-.16A6.34 6.34 0 0 0 2.5 15.6a6.34 6.34 0 0 0 9.17 5.66c2.58-1.51 4.15-4.3 4.15-7.3V8.84a8.28 8.28 0 0 0 4.77 1.49V6.89a4.83 4.83 0 0 1-1-.2z"/></svg>
              </a>
            </div>
          </div>

          <!-- Column 2: COMPANY -->
          <div class="figma-footer-column">
            <h4>COMPANY</h4>
            <ul class="figma-footer-links-list">
              <li><a href="#about">About Our Story</a></li>
              <li><a href="#shop">Collection</a></li>
              <li><a href="#shop?filter=new-arrivals">New Arrivals</a></li>
              <li><a href="#about">Craftsmanship</a></li>
            </ul>
          </div>

          <!-- Column 3: HELP -->
          <div class="figma-footer-column">
            <h4>HELP</h4>
            <ul class="figma-footer-links-list">
              <li><a href="#faq">Customer Support & Help</a></li>
              <li><a href="#faq">Delivery & White-Glove</a></li>
              <li><a href="#terms">Terms & Conditions</a></li>
              <li><a href="#terms">Privacy Policy</a></li>
            </ul>
          </div>

          <!-- Column 4: FAQ -->
          <div class="figma-footer-column">
            <h4>FAQ</h4>
            <ul class="figma-footer-links-list">
              <li><a href="#customer/dashboard">Customer Account</a></li>
              <li><a href="#faq">Delivery FAQ</a></li>
              <li><a href="#customer/dashboard">Order Tracking</a></li>
              <li><a href="#faq">Payment Methods</a></li>
            </ul>
          </div>
        </div>

        <!-- Divider -->
        <hr class="figma-footer-divider">

        <!-- Bottom Row -->
        <div class="figma-footer-bottom-row">
          <span>furniturehubdhangadhi.com &copy; 2025-2026, All Rights Reserved • Dhangadhi, Nepal</span>

          <div class="figma-payment-pills">
            <!-- Visa -->
            <div class="figma-pay-badge" style="color: #1a1f71; font-weight: 800; font-style: italic; font-size: 0.95rem; font-family: sans-serif;">
              VISA
            </div>
            <!-- Mastercard -->
            <div class="figma-pay-badge" style="display: flex; align-items: center; justify-content: center;">
              <svg width="24" height="16" viewBox="0 0 32 20">
                <circle cx="10" cy="10" r="9" fill="#EB001B"/>
                <circle cx="22" cy="10" r="9" fill="#F79E1B" fill-opacity="0.8"/>
              </svg>
            </div>
            <!-- PayPal -->
            <div class="figma-pay-badge" style="color: #003087; font-weight: 800; font-style: italic; font-size: 0.85rem; font-family: sans-serif;">
              PayPal
            </div>
            <!-- Apple Pay -->
            <div class="figma-pay-badge" style="color: #000000; font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 2px;">
              <span style="font-size: 1rem;"></span>Pay
            </div>
            <!-- Google Pay -->
            <div class="figma-pay-badge" style="color: #5f6368; font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 2px;">
              <span style="color: #4285F4; font-weight: 800;">G</span>&nbsp;Pay
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
