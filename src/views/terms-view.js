import { renderFigmaFooter } from '../components/footer.js';

export function renderTermsView(container, state, events) {
  container.innerHTML = `
    <!-- BREADCRUMBS -->
    <div class="container" style="padding-top: 24px;">
      <nav class="breadcrumbs">
        <a href="#home">Home</a>
        <span class="separator">/</span>
        <span>Terms & Privacy Policy</span>
      </nav>
    </div>

    <!-- TERMS HERO -->
    <section style="padding: 50px 20px 50px; text-align: center; background: radial-gradient(circle at center, rgba(18, 45, 37, 0.04) 0%, rgba(18, 45, 37, 0) 70%);">
      <div class="site-container" style="max-width: 800px; margin: 0 auto;">
        <span class="badge-tag" style="margin-bottom: 14px; background: rgba(18, 45, 37, 0.08); color: var(--color-primary); font-weight: 800;">
          Legal, Guarantee & Customer Trust
        </span>
        <h1 style="font-family: var(--font-heading); font-size: clamp(2.3rem, 5vw, 3.6rem); font-weight: 800; color: var(--color-primary); line-height: 1.2; margin-bottom: 16px;">
          Terms of Service & Privacy
        </h1>
        <p style="font-size: 1.05rem; color: var(--color-text-subtle); line-height: 1.6; max-width: 600px; margin: 0 auto 24px;">
          Clear, transparent commitments to protect your purchases, your personal data, and our craftsmanship guarantees.
        </p>
        <div style="font-size: 0.85rem; color: var(--color-text-subtle);">
          Last updated: January 2026 • Furniture Hub Dhangadhi Pvt. Ltd.
        </div>
      </div>
    </section>

    <!-- CONTENT SECTION -->
    <section class="site-container" style="max-width: 860px; margin: 0 auto; padding: 30px 20px 80px;">
      
      <!-- NAVIGATION TABS -->
      <div style="display: flex; gap: 12px; border-bottom: 2px solid rgba(18, 45, 37, 0.1); margin-bottom: 36px;">
        <button id="tab-terms-btn" class="terms-tab-btn active" style="padding: 12px 22px; font-weight: 800; font-size: 1.02rem; background: none; border: none; border-bottom: 3px solid var(--color-primary); color: var(--color-primary); cursor: pointer; margin-bottom: -2px;">
          📜 Terms of Service
        </button>
        <button id="tab-privacy-btn" class="terms-tab-btn" style="padding: 12px 22px; font-weight: 700; font-size: 1.02rem; background: none; border: none; border-bottom: 3px solid transparent; color: var(--color-text-subtle); cursor: pointer; margin-bottom: -2px;">
          🔒 Privacy & Data Protection
        </button>
      </div>

      <!-- TAB 1: TERMS OF SERVICE -->
      <div id="panel-terms" class="terms-panel" style="display: block;">
        <div style="display: flex; flex-direction: column; gap: 28px;">
          
          <div style="background: #ffffff; border: 1.5px solid rgba(18, 45, 37, 0.1); border-radius: 16px; padding: 28px;">
            <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--color-primary); margin-bottom: 12px;">
              1. Orders & WhatsApp Verification
            </h3>
            <p style="font-size: 0.95rem; line-height: 1.7; color: var(--color-text); margin-bottom: 10px;">
              All orders placed on <strong>Furniture Hub Dhangadhi</strong> are authenticated and coordinated via our dedicated customer portal and direct WhatsApp concierge. Placing an order constitutes an offer to purchase the specified timber piece under the prevailing showroom price.
            </p>
            <p style="font-size: 0.95rem; line-height: 1.7; color: var(--color-text);">
              Our sales manager will verify your delivery address, room access logistics (e.g. elevator width, stairwells), and schedule before the consignment leaves our central warehouse.
            </p>
          </div>

          <div style="background: #ffffff; border: 1.5px solid rgba(18, 45, 37, 0.1); border-radius: 16px; padding: 28px;">
            <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--color-primary); margin-bottom: 12px;">
              2. 5-Year Structural Timber Guarantee
            </h3>
            <p style="font-size: 0.95rem; line-height: 1.7; color: var(--color-text); margin-bottom: 10px;">
              We stand unreservedly behind our joinery and materials. All solid wood dining frames, executive chairs, credenzas, and coffee tables carry an unconditional <strong>5-Year Structural Warranty</strong>.
            </p>
            <ul style="padding-left: 20px; font-size: 0.93rem; line-height: 1.7; color: var(--color-text-subtle);">
              <li><strong>Covered:</strong> Frame breakage, joint loosening, mortise-tenon separation, pneumatic gas-lift failure under standard indoor use.</li>
              <li><strong>Not Covered:</strong> Natural wood grain cosmetic variations, intentional misuse, moisture immersion, outdoor weathering of indoor items, or burns.</li>
            </ul>
          </div>

          <div style="background: #ffffff; border: 1.5px solid rgba(18, 45, 37, 0.1); border-radius: 16px; padding: 28px;">
            <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--color-primary); margin-bottom: 12px;">
              3. White-Glove Delivery & Inspection
            </h3>
            <p style="font-size: 0.95rem; line-height: 1.7; color: var(--color-text); margin-bottom: 10px;">
              Within Dhangadhi, Kailali, and across Sudurpashchim Province, delivery includes careful room placement and professional assembly by our trained technicians.
            </p>
            <p style="font-size: 0.95rem; line-height: 1.7; color: var(--color-text);">
              Customers must inspect the furniture piece at the moment of delivery. Once satisfied, a digital delivery confirmation is signed with our courier specialist.
            </p>
          </div>

          <div style="background: #ffffff; border: 1.5px solid rgba(18, 45, 37, 0.1); border-radius: 16px; padding: 28px;">
            <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--color-primary); margin-bottom: 12px;">
              4. 7-Day Exchange & Return Policy
            </h3>
            <p style="font-size: 0.95rem; line-height: 1.7; color: var(--color-text);">
              If an item is damaged upon delivery or significantly differs from specifications, you may request an immediate replacement or full refund within 7 days of delivery. The item must be returned in its original unblemished condition.
            </p>
          </div>

        </div>
      </div>

      <!-- TAB 2: PRIVACY POLICY -->
      <div id="panel-privacy" class="terms-panel" style="display: none;">
        <div style="display: flex; flex-direction: column; gap: 28px;">
          
          <div style="background: #ffffff; border: 1.5px solid rgba(18, 45, 37, 0.1); border-radius: 16px; padding: 28px;">
            <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--color-primary); margin-bottom: 12px;">
              1. Strict Customer Data Isolation
            </h3>
            <p style="font-size: 0.95rem; line-height: 1.7; color: var(--color-text); margin-bottom: 10px;">
              Your privacy is paramount. At Furniture Hub Dhangadhi, every registered customer's shopping cart, delivery address, wishlist, and order history are strictly isolated:
            </p>
            <ul style="padding-left: 20px; font-size: 0.93rem; line-height: 1.7; color: var(--color-text-subtle);">
              <li>No customer can ever view another customer's orders, contact information, or cart contents.</li>
              <li>Only authorized store administrators can view aggregate store operations.</li>
              <li>We never sell, rent, or trade your contact information to marketing agencies or third parties.</li>
            </ul>
          </div>

          <div style="background: #ffffff; border: 1.5px solid rgba(18, 45, 37, 0.1); border-radius: 16px; padding: 28px;">
            <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--color-primary); margin-bottom: 12px;">
              2. Authentication & Credentials
            </h3>
            <p style="font-size: 0.95rem; line-height: 1.7; color: var(--color-text);">
              We support secure sign-in with Google and encrypted customer access. We do not store plain-text passwords. All communication between your browser and our store occurs over encrypted HTTPS (TLS 1.3).
            </p>
          </div>

          <div style="background: #ffffff; border: 1.5px solid rgba(18, 45, 37, 0.1); border-radius: 16px; padding: 28px;">
            <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--color-primary); margin-bottom: 12px;">
              3. WhatsApp Communications
            </h3>
            <p style="font-size: 0.95rem; line-height: 1.7; color: var(--color-text);">
              When you submit an order, your phone number and order summary are passed into WhatsApp's end-to-end encrypted messaging environment for order fulfillment. We only send notifications directly related to your active furniture dispatch.
            </p>
          </div>

          <div style="background: #ffffff; border: 1.5px solid rgba(18, 45, 37, 0.1); border-radius: 16px; padding: 28px;">
            <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--color-primary); margin-bottom: 12px;">
              4. Data Removal Requests
            </h3>
            <p style="font-size: 0.95rem; line-height: 1.7; color: var(--color-text);">
              You have the right to request deletion of your account and customer history at any time. Simply contact us at <a href="mailto:privacy@furniturehubdhangadhi.com" style="color: var(--color-primary); font-weight: 700;">privacy@furniturehubdhangadhi.com</a> or message our WhatsApp concierge.
            </p>
          </div>

        </div>
      </div>

      <!-- NEED CLARIFICATION CALLOUT -->
      <div style="margin-top: 40px; padding: 24px; background: rgba(18, 45, 37, 0.04); border-radius: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="font-weight: 800; color: var(--color-primary); margin-bottom: 2px;">Have specific legal or commercial procurement requirements?</div>
          <div style="font-size: 0.9rem; color: var(--color-text-subtle);">Our legal and corporate affairs team is available to assist your architect or company.</div>
        </div>
        <a href="mailto:privacy@furniturehubdhangadhi.com" class="btn btn-outline btn-sm" style="border-color: var(--color-primary); color: var(--color-primary); font-weight: 700; border-radius: 8px;">
          Contact Legal Team
        </a>
      </div>

    </section>

    <!-- FIGMA FOOTER -->
    ${renderFigmaFooter()}
  `;

  // Tab switching logic
  const termsBtn = container.querySelector('#tab-terms-btn');
  const privacyBtn = container.querySelector('#tab-privacy-btn');
  const termsPanel = container.querySelector('#panel-terms');
  const privacyPanel = container.querySelector('#panel-privacy');

  if (termsBtn && privacyBtn && termsPanel && privacyPanel) {
    termsBtn.addEventListener('click', () => {
      termsBtn.style.borderBottom = '3px solid var(--color-primary)';
      termsBtn.style.color = 'var(--color-primary)';
      termsBtn.style.fontWeight = '800';

      privacyBtn.style.borderBottom = '3px solid transparent';
      privacyBtn.style.color = 'var(--color-text-subtle)';
      privacyBtn.style.fontWeight = '700';

      termsPanel.style.display = 'block';
      privacyPanel.style.display = 'none';
    });

    privacyBtn.addEventListener('click', () => {
      privacyBtn.style.borderBottom = '3px solid var(--color-primary)';
      privacyBtn.style.color = 'var(--color-primary)';
      privacyBtn.style.fontWeight = '800';

      termsBtn.style.borderBottom = '3px solid transparent';
      termsBtn.style.color = 'var(--color-text-subtle)';
      termsBtn.style.fontWeight = '700';

      termsPanel.style.display = 'none';
      privacyPanel.style.display = 'block';
    });
  }
}
