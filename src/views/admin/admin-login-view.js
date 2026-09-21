export function renderAdminLoginView(container, state, events) {
  container.innerHTML = `
    <div class="admin-login-wrapper" style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px;">
      <div class="admin-login-box" style="max-width: 480px; width: 100%; text-align: center; background: #ffffff; border-radius: 20px; padding: 40px 32px; box-shadow: 0 12px 36px rgba(18, 45, 37, 0.08); border: 1px solid rgba(18, 45, 37, 0.08);">
        <div class="login-brand-header" style="margin-bottom: 24px;">
          <img src="/images/furniture-hub-logo.png" alt="Furniture Hub Dhangadhi" style="height: 48px; margin-bottom: 16px;">
          <h2 style="font-family: var(--font-heading); color: var(--color-primary); font-size: 1.6rem; margin-bottom: 8px;">
            Sign In Portal
          </h2>
          <p style="color: var(--color-text-muted); font-size: 0.9rem; line-height: 1.5;">
            Store administrators and customers sign in securely through the Furniture Hub Dhangadhi portal.
          </p>
        </div>

        <div style="background: rgba(18, 45, 37, 0.04); border-radius: 14px; padding: 20px; margin-bottom: 24px; text-align: left;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <span style="font-size: 1.2rem;">🛡️</span>
            <strong style="color: var(--color-primary); font-size: 0.95rem;">Role-Based Security Active</strong>
          </div>
          <p style="font-size: 0.82rem; color: var(--color-text-subtle); margin: 0; line-height: 1.4;">
            Your credentials automatically determine whether you are routed to the storefront or the administrative database workspace.
          </p>
        </div>

        <button type="button" class="btn btn-primary" id="btn-open-unified-portal" style="width: 100%; padding: 14px; font-weight: 800; border-radius: 12px; font-size: 1rem; margin-bottom: 16px;">
          Open Unified Sign In Portal
        </button>

        <a href="#home" style="font-size: 0.85rem; color: var(--color-text-muted); font-weight: 600; text-decoration: underline;">
          ← Return to Storefront
        </a>
      </div>
    </div>
  `;

  const openBtn = container.querySelector('#btn-open-unified-portal');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      state.customerAuthTab = 'login';
      state.isCustomerAuthOpen = true;
      window.location.hash = '#home';
    });
  }
}
