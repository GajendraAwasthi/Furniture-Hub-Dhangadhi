import { escapeHtml, sanitizePhoneNumber } from '../utils/security.js';

/**
 * Premium Post-Login Details & Location Dialog Modal
 * Appears immediately after login for user to enter contact number and address.
 */
export function openPostLoginOnboardingModal(user, onSave) {
  // Remove existing modal if present
  const existing = document.getElementById('post-login-onboarding-wrap');
  if (existing) existing.remove();

  const currentName = user?.name || '';
  const currentPhone = user?.phone || '';
  const currentAddress = user?.address || '';
  const currentCity = user?.city || 'Dhangadhi';

  const modalHtml = `
    <div class="modal-backdrop open" id="post-login-onboarding-wrap" style="z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgba(18, 45, 37, 0.6); backdrop-filter: blur(8px);">
      <div class="modal-card luxury-onboarding-card" style="max-width: 480px; width: 92%; padding: 0; border-radius: 24px; box-shadow: 0 28px 70px rgba(18, 45, 37, 0.28); border: 1px solid rgba(255, 255, 255, 0.6); background: #ffffff; overflow: hidden; animation: onboardingFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
        
        <!-- Luxury Top Header Banner -->
        <div style="background: linear-gradient(135deg, #122d25 0%, #1b3f34 100%); padding: 32px 28px 26px 28px; text-align: center; color: #ffffff; position: relative;">
          <div style="width: 44px; height: 44px; margin: 0 auto 12px auto; background: rgba(255, 255, 255, 0.12); border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); border: 1px solid rgba(255, 255, 255, 0.2);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <h2 style="font-family: var(--font-heading); font-size: 1.45rem; font-weight: 800; letter-spacing: -0.01em; margin: 0 0 6px 0; color: #ffffff;">
            Delivery & Contact Details
          </h2>
          <p style="font-size: 0.88rem; color: rgba(255, 255, 255, 0.8); line-height: 1.4; margin: 0; max-width: 360px; margin: 0 auto;">
            Please enter your WhatsApp contact and location for doorstep delivery in Dhangadhi & Sudurpashchim.
          </p>
        </div>

        <!-- Form Body -->
        <form id="post-login-onboarding-form" style="padding: 26px 28px 30px 28px;">
          
          <!-- Full Name Field -->
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
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
                style="width: 100%; height: 48px; border-radius: 12px; border: 1.5px solid rgba(18, 45, 37, 0.14); background: #faf9f6; padding: 0 16px 0 42px; font-size: 0.95rem; font-family: inherit; color: var(--color-primary); transition: all 0.2s ease; outline: none;"
              >
            </div>
          </div>

          <!-- Mobile & City Row (Responsive 2-column) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
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
                  style="width: 100%; height: 48px; border-radius: 12px; border: 1.5px solid rgba(18, 45, 37, 0.14); background: #faf9f6; padding: 0 14px 0 42px; font-size: 0.95rem; font-family: inherit; color: var(--color-primary); transition: all 0.2s ease; outline: none;"
                >
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
                City / Region
              </label>
              <select 
                class="onboard-luxury-input" 
                id="onboard-city" 
                required
                style="width: 100%; height: 48px; border-radius: 12px; border: 1.5px solid rgba(18, 45, 37, 0.14); background: #faf9f6; padding: 0 12px; font-size: 0.9rem; font-family: inherit; color: var(--color-primary); transition: all 0.2s ease; outline: none; cursor: pointer;"
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
          <div style="margin-bottom: 24px;">
            <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
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
                style="width: 100%; height: 48px; border-radius: 12px; border: 1.5px solid rgba(18, 45, 37, 0.14); background: #faf9f6; padding: 0 16px 0 42px; font-size: 0.95rem; font-family: inherit; color: var(--color-primary); transition: all 0.2s ease; outline: none;"
              >
            </div>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            id="onboard-submit-btn" 
            style="width: 100%; height: 50px; background: var(--color-primary); color: #ffffff; border: none; border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 6px 18px rgba(18, 45, 37, 0.22); transition: all 0.2s ease; letter-spacing: 0.01em;"
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

    <style>
      @keyframes onboardingFadeIn {
        from { opacity: 0; transform: scale(0.95) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      .onboard-luxury-input:focus {
        border-color: #122d25 !important;
        background: #ffffff !important;
        box-shadow: 0 0 0 3px rgba(18, 45, 37, 0.1) !important;
      }
      #onboard-submit-btn:hover {
        background: #1b3f34 !important;
        transform: translateY(-1px);
        box-shadow: 0 8px 24px rgba(18, 45, 37, 0.3) !important;
      }
      @media (max-width: 480px) {
        .luxury-onboarding-card {
          width: 95% !important;
        }
        #post-login-onboarding-form {
          padding: 20px 20px 24px 20px !important;
        }
      }
    </style>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const wrap = document.getElementById('post-login-onboarding-wrap');
  const form = document.getElementById('post-login-onboarding-form');

  function cleanup() {
    if (wrap) wrap.remove();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('onboard-name').value.trim();
    const phone = sanitizePhoneNumber(document.getElementById('onboard-phone').value.trim());
    const city = document.getElementById('onboard-city').value;
    const address = document.getElementById('onboard-address').value.trim();

    cleanup();
    if (onSave) {
      onSave({ name, phone, city, address });
    }
  });
}
