import { escapeHtml, sanitizePhoneNumber, safeSetJson } from '../../utils/security.js';
import { updateCustomerProfile } from '../../services/customer-auth.js';

/**
 * Customer Onboarding View (#onboarding, #complete-profile)
 * Ensures Google OAuth and newly registered customers have a persistent, reliable
 * page to input mandatory delivery address and WhatsApp mobile number without
 * losing state or getting redirected upon browser refresh.
 */
export function renderOnboardingView(container, state, events) {
  const customer = state.customerUser;
  if (!customer) {
    events.emit('toast', { message: 'Please sign in to complete your delivery details.', type: 'info' });
    events.emit('open-customer-auth');
    window.location.hash = '#home';
    return;
  }

  const currentName = customer.name || '';
  const currentPhone = customer.phone || '';
  const currentAddress = customer.address || '';
  const currentCity = customer.city || 'Dhangadhi';

  container.innerHTML = `
    <div class="customer-onboarding-wrapper" style="min-height: calc(100vh - 120px); min-height: calc(100dvh - 120px); display: flex; align-items: center; justify-content: center; padding: 48px 20px; background-color: var(--color-bg-light); box-sizing: border-box;">
      <div class="luxury-onboarding-card" style="max-width: 520px; width: 100%; border-radius: 24px; box-shadow: 0 24px 64px rgba(18, 45, 37, 0.12); border: 1px solid rgba(18, 45, 37, 0.08); background: #ffffff; overflow: hidden; animation: onboardingFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
        
        <!-- Top Luxury Banner -->
        <div style="background: linear-gradient(135deg, #122d25 0%, #1b3f34 100%); padding: 36px 32px 30px 32px; text-align: center; color: #ffffff; position: relative;">
          <div style="width: 52px; height: 52px; margin: 0 auto 14px auto; background: rgba(255, 255, 255, 0.12); border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); border: 1px solid rgba(255, 255, 255, 0.2);">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <h1 style="font-family: var(--font-heading); font-size: 1.55rem; font-weight: 800; letter-spacing: -0.01em; margin: 0 0 8px 0; color: #ffffff;">
            Delivery & Contact Details
          </h1>
          <p style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.82); line-height: 1.45; margin: 0; max-width: 380px; margin: 0 auto;">
            Please enter your WhatsApp contact and doorstep delivery address in Dhangadhi & Sudurpashchim.
          </p>
        </div>

        <!-- Form Body -->
        <form id="customer-onboarding-form" style="padding: 28px 32px 34px 32px;">
          
          <!-- Full Name Field -->
          <div style="margin-bottom: 18px;">
            <label for="onboard-name" style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
              Full Name
            </label>
            <div style="position: relative; display: flex; align-items: center;">
              <span style="position: absolute; left: 14px; color: var(--color-text-subtle); display: flex; align-items: center; pointer-events: none;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </span>
              <input 
                type="text" 
                class="onboard-luxury-input" 
                id="onboard-name" 
                placeholder="e.g. Ram Bahadur" 
                value="${escapeHtml(currentName)}" 
                required
                style="width: 100%; height: 50px; border-radius: 12px; border: 1.5px solid rgba(18, 45, 37, 0.14); background: #faf9f6; padding: 0 16px 0 42px; font-size: 0.95rem; font-family: inherit; color: var(--color-primary); transition: all 0.2s ease; outline: none; box-sizing: border-box;"
              >
            </div>
          </div>

          <!-- Mobile & City Row (Responsive 2-column) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px;">
            <div>
              <label for="onboard-phone" style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
                WhatsApp Mobile
              </label>
              <div style="position: relative; display: flex; align-items: center;">
                <span style="position: absolute; left: 14px; color: var(--color-text-subtle); display: flex; align-items: center; pointer-events: none;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </span>
                <input 
                  type="tel" 
                  class="onboard-luxury-input" 
                  id="onboard-phone" 
                  placeholder="98XXXXXXXX" 
                  value="${escapeHtml(currentPhone)}" 
                  required
                  style="width: 100%; height: 50px; border-radius: 12px; border: 1.5px solid rgba(18, 45, 37, 0.14); background: #faf9f6; padding: 0 14px 0 42px; font-size: 0.95rem; font-family: inherit; color: var(--color-primary); transition: all 0.2s ease; outline: none; box-sizing: border-box;"
                >
              </div>
            </div>

            <div>
              <label for="onboard-city" style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
                City / Region
              </label>
              <select 
                class="onboard-luxury-input" 
                id="onboard-city" 
                required
                style="width: 100%; height: 50px; border-radius: 12px; border: 1.5px solid rgba(18, 45, 37, 0.14); background: #faf9f6; padding: 0 12px; font-size: 0.9rem; font-family: inherit; color: var(--color-primary); transition: all 0.2s ease; outline: none; cursor: pointer; box-sizing: border-box;"
              >
                <option value="Dhangadhi" ${currentCity === 'Dhangadhi' ? 'selected' : ''}>Dhangadhi (Kailali)</option>
                <option value="Attariya" ${currentCity === 'Attariya' ? 'selected' : ''}>Attariya (Kailali)</option>
                <option value="Tikapur" ${currentCity === 'Tikapur' ? 'selected' : ''}>Tikapur (Kailali)</option>
                <option value="Mahendranagar" ${currentCity === 'Mahendranagar' ? 'selected' : ''}>Mahendranagar (Kanchanpur)</option>
                <option value="Dadeldhura" ${currentCity === 'Dadeldhura' ? 'selected' : ''}>Dadeldhura</option>
                <option value="Kathmandu Valley" ${currentCity === 'Kathmandu Valley' ? 'selected' : ''}>Kathmandu Valley</option>
                <option value="Other Sudurpashchim" ${currentCity === 'Other Sudurpashchim' ? 'selected' : ''}>Other Sudurpashchim</option>
                <option value="Other Nepal" ${currentCity === 'Other Nepal' ? 'selected' : ''}>Other Nepal</option>
              </select>
            </div>
          </div>

          <!-- Street Address / Landmark -->
          <div style="margin-bottom: 26px;">
            <label for="onboard-address" style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
              Delivery Address & Landmark
            </label>
            <div style="position: relative; display: flex; align-items: center;">
              <span style="position: absolute; left: 14px; color: var(--color-text-subtle); display: flex; align-items: center; pointer-events: none;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              </span>
              <input 
                type="text" 
                class="onboard-luxury-input" 
                id="onboard-address" 
                placeholder="e.g. Hasanpur, Ward 5, Near Chauraha" 
                value="${escapeHtml(currentAddress)}" 
                required
                style="width: 100%; height: 50px; border-radius: 12px; border: 1.5px solid rgba(18, 45, 37, 0.14); background: #faf9f6; padding: 0 16px 0 42px; font-size: 0.95rem; font-family: inherit; color: var(--color-primary); transition: all 0.2s ease; outline: none; box-sizing: border-box;"
              >
            </div>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            id="onboard-submit-btn" 
            style="width: 100%; height: 52px; background: var(--color-primary); color: #ffffff; border: none; border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 6px 20px rgba(18, 45, 37, 0.24); transition: all 0.2s ease; letter-spacing: 0.01em;"
          >
            <span>Confirm & Continue</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </form>

      </div>
    </div>
  `;

  const form = container.querySelector('#customer-onboarding-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = container.querySelector('#onboard-name').value.trim();
      const phone = sanitizePhoneNumber(container.querySelector('#onboard-phone').value.trim());
      const city = container.querySelector('#onboard-city').value;
      const address = container.querySelector('#onboard-address').value.trim();

      // Validate digit count: require 8–15 digits with an optional leading +
      const isValidPhone = /^\+?\d{8,15}$/.test(phone);
      if (!name || !isValidPhone || !address) {
        events.emit('toast', {
          message: !name
            ? 'Please provide your full name.'
            : !isValidPhone
              ? 'Please enter a valid WhatsApp number (8–15 digits, e.g. 9800000000).'
              : 'Please provide your delivery address.',
          type: 'danger'
        });
        return;
      }

      // Save customer profile with whitelisted sanitization
      const updated = updateCustomerProfile(customer.id, { name, phone, city, address });
      if (!updated) {
        events.emit('toast', { message: 'Unable to save your delivery details.', type: 'danger' });
        return;
      }

      // Use only the sanitized result — never raw form values — to prevent HTML injection
      state.customerUser = updated;
      state.customerProfile = {
        name: updated.name,
        phone: updated.phone,
        city: updated.city,
        address: updated.address
      };

      safeSetJson('fh_customer_profile', state.customerProfile);
      events.emit('toast', { message: 'Delivery details saved! Welcome to Furniture Hub Dhangadhi.', type: 'success' });
      events.emit('chrome-update');

      // Honour any pending tab saved before the auth guard redirected the visitor
      const pendingTab = sessionStorage.getItem('fh_pending_tab');
      sessionStorage.removeItem('fh_pending_tab');
      window.location.hash = pendingTab
        ? `#customer/dashboard?tab=${pendingTab}`
        : '#customer/dashboard';
    });
  }
}
