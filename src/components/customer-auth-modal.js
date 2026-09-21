export function renderCustomerAuthModal(container, state, events) {
  const activeTab = state.customerAuthTab || 'login'; // 'login' or 'register'

  container.innerHTML = `
    <!-- Unified Auth Backdrop -->
    <div class="modal-backdrop ${state.isCustomerAuthOpen ? 'open' : ''}" id="customer-auth-backdrop">
      <div class="modal-card customer-auth-modal-card" style="max-width: 460px;">
        <!-- Header -->
        <div class="customer-auth-header">
          <div class="cauth-brand">
            <img src="/images/furniture-hub-logo.png" alt="Furniture Hub Dhangadhi" style="height: 38px; width: auto;">
            <div>
              <h3>Sign In to Furniture Hub Dhangadhi</h3>
              <p>Access your orders, saved wishlist, and delivery details</p>
            </div>
          </div>
          <button class="btn-icon" id="customer-auth-close-btn" aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Tab Switcher -->
        <div class="cauth-tabs" style="margin-bottom: 20px;">
          <button type="button" class="cauth-tab ${activeTab === 'login' ? 'active' : ''}" id="cauth-tab-login">
            <span>Sign In</span>
          </button>
          <button type="button" class="cauth-tab ${activeTab === 'register' ? 'active' : ''}" id="cauth-tab-register">
            <span>Create Account</span>
          </button>
        </div>

        <!-- 1. SIGN IN PANE -->
        <div class="cauth-tab-pane ${activeTab === 'login' ? 'active' : ''}" id="cauth-pane-login">
          <!-- Google OAuth Button -->
          <div class="oauth-buttons-column" style="margin-bottom: 18px;">
            <button type="button" class="btn-oauth btn-oauth-google" id="btn-oauth-google" style="width: 100%; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          <!-- Divider -->
          <div class="cauth-divider" style="display: flex; align-items: center; text-align: center; margin: 18px 0; color: var(--color-text-subtle); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em;">
            <span style="flex: 1; border-bottom: 1px solid rgba(18, 45, 37, 0.12);"></span>
            <span style="padding: 0 12px; font-weight: 700;">Or with Email / Mobile</span>
            <span style="flex: 1; border-bottom: 1px solid rgba(18, 45, 37, 0.12);"></span>
          </div>

          <!-- Email / Mobile Sign In Form -->
          <form id="customer-oauth-direct-form" style="background: #faf9f6; padding: 18px; border-radius: 12px; border: 1px solid rgba(18, 45, 37, 0.08);">
            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" for="cauth-direct-id" style="font-weight: 700; font-size: 0.88rem;">Email Address or Mobile Number</label>
              <input 
                type="text" 
                class="form-input" 
                id="cauth-direct-id" 
                placeholder="e.g. name@example.com or 98XXXXXXXX" 
                required
              >
            </div>

            <button type="submit" class="btn btn-primary" id="cauth-direct-submit" style="width: 100%; padding: 13px; font-weight: 800; border-radius: 10px; font-size: 0.95rem;">
              Sign In to Account
            </button>
          </form>

          <div style="text-align: center; margin-top: 18px; font-size: 0.85rem; color: var(--color-text-muted);">
            Don't have an account yet? 
            <button type="button" id="cauth-switch-to-register" style="color: var(--color-primary); font-weight: 800; text-decoration: underline; background: none; border: none; cursor: pointer;">
              Create account
            </button>
          </div>
        </div>

        <!-- 2. CREATE ACCOUNT FORM -->
        <div class="cauth-tab-pane ${activeTab === 'register' ? 'active' : ''}" id="cauth-pane-register">
          <form id="customer-register-form">
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" for="cauth-reg-name">Full Name *</label>
              <input 
                type="text" 
                class="form-input" 
                id="cauth-reg-name" 
                placeholder="e.g. Ram Bahadur Thapa" 
                required
              >
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <div class="form-label-row">
                <label class="form-label" for="cauth-reg-phone">WhatsApp Contact Number *</label>
                <span class="phone-hint-badge">🇳🇵 10 digits</span>
              </div>
              <input 
                type="tel" 
                class="form-input phone-highlight" 
                id="cauth-reg-phone" 
                placeholder="e.g. 98XXXXXXXX" 
                required
              >
              <span class="form-sub-hint">We send delivery tracking and order confirmations to this number.</span>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" for="cauth-reg-email">Email Address *</label>
              <input 
                type="email" 
                class="form-input" 
                id="cauth-reg-email" 
                placeholder="e.g. user@example.com" 
                required
              >
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" for="cauth-reg-address">Delivery Address / Street / Landmark *</label>
              <input 
                type="text" 
                class="form-input" 
                id="cauth-reg-address" 
                placeholder="e.g. Hasanpur Ward 5, Near Chauraha" 
                required
              >
            </div>

            <div class="form-group" style="margin-bottom: 18px;">
              <label class="form-label" for="cauth-reg-city">City / Region *</label>
              <select class="form-input checkout-select" id="cauth-reg-city">
                <option value="Dhangadhi" selected>Dhangadhi (Kailali)</option>
                <option value="Attariya">Attariya (Kailali)</option>
                <option value="Tikapur">Tikapur (Kailali)</option>
                <option value="Mahendranagar">Mahendranagar (Kanchanpur)</option>
                <option value="Dadeldhura">Dadeldhura</option>
                <option value="Kathmandu Valley">Kathmandu Valley</option>
                <option value="Other Sudurpashchim">Other Sudurpashchim</option>
                <option value="Other Nepal">Other Nepal</option>
              </select>
            </div>

            <button type="submit" class="btn btn-primary" id="cauth-reg-submit" style="width: 100%; padding: 14px; font-weight: 800; border-radius: 12px; font-size: 1rem;">
              Complete Registration
            </button>
          </form>

          <div style="text-align: center; margin-top: 16px; font-size: 0.85rem; color: var(--color-text-muted);">
            Already have an account? 
            <button type="button" id="cauth-switch-to-login" style="color: var(--color-primary); font-weight: 800; text-decoration: underline; background: none; border: none; cursor: pointer;">
              Sign in here
            </button>
          </div>
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

  // Tab switching
  const tabLogin = container.querySelector('#cauth-tab-login');
  const tabRegister = container.querySelector('#cauth-tab-register');
  const switchToRegister = container.querySelector('#cauth-switch-to-register');
  const switchToLogin = container.querySelector('#cauth-switch-to-login');

  function setTab(tab) {
    state.customerAuthTab = tab;
    renderCustomerAuthModal(container, state, events);
  }

  if (tabLogin) tabLogin.addEventListener('click', () => setTab('login'));
  if (tabRegister) tabRegister.addEventListener('click', () => setTab('register'));
  if (switchToRegister) switchToRegister.addEventListener('click', () => setTab('register'));
  if (switchToLogin) switchToLogin.addEventListener('click', () => setTab('login'));

  // 1. Google OAuth Only
  const googleBtn = container.querySelector('#btn-oauth-google');
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      events.emit('oauth-login', { provider: 'google' });
    });
  }

  // 2. Direct Sign In
  const directForm = container.querySelector('#customer-oauth-direct-form');
  if (directForm) {
    directForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const identifier = container.querySelector('#cauth-direct-id').value.trim();
      events.emit('oauth-direct-login', { identifier });
    });
  }

  // 3. Register submit
  const registerForm = container.querySelector('#customer-register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = container.querySelector('#cauth-reg-name').value.trim();
      const phone = container.querySelector('#cauth-reg-phone').value.trim();
      const email = container.querySelector('#cauth-reg-email').value.trim();
      const address = container.querySelector('#cauth-reg-address').value.trim();
      const city = container.querySelector('#cauth-reg-city').value;

      events.emit('customer-register', {
        name,
        phone,
        email,
        address,
        city,
        password: 'customer-auth'
      });
    });
  }
}
