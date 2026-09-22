export function renderCustomerAuthModal(container, state, events) {
  container.innerHTML = `
    <!-- Unified Auth Backdrop -->
    <div class="modal-backdrop ${state.isCustomerAuthOpen ? 'open' : ''}" id="customer-auth-backdrop">
      <div class="modal-card customer-auth-modal-card" style="max-width: 420px; text-align: center; padding: 36px 28px;">
        <!-- Close Button -->
        <div style="display: flex; justify-content: flex-end; margin-top: -12px; margin-right: -12px;">
          <button class="btn-icon" id="customer-auth-close-btn" aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Brand Header -->
        <div style="margin-bottom: 28px;">
          <img src="/images/furniture-hub-logo.png" alt="Furniture Hub Dhangadhi" style="height: 52px; width: auto; margin: 0 auto 16px auto; display: block; border-radius: 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.15);">
          <h3 style="font-size: 1.45rem; font-weight: 800; color: var(--color-primary); margin-bottom: 8px;">
            Sign In to Furniture Hub
          </h3>
          <p style="font-size: 0.9rem; color: var(--color-text-muted); line-height: 1.5; max-width: 320px; margin: 0 auto;">
            Access your orders, saved items, and personalized shopping cart for Dhangadhi & Sudurpashchim.
          </p>
        </div>

        <!-- Google OAuth Button Only -->
        <div>
          <button type="button" class="btn-oauth btn-oauth-google" id="btn-oauth-google" style="width: 100%; justify-content: center; padding: 14px 20px; font-size: 1rem; font-weight: 700; border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.06); cursor: pointer;">
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach event handlers
  const backdrop = container.querySelector('#customer-auth-backdrop');
  const closeBtn = container.querySelector('#customer-auth-close-btn');

  function closeAuthModal() {
    events.emit('close-customer-auth');
  }

  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeAuthModal();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);

  // Google OAuth Only
  const googleBtn = container.querySelector('#btn-oauth-google');
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      events.emit('oauth-login', { provider: 'google' });
    });
  }
}
