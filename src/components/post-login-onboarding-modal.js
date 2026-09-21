import { escapeHtml, sanitizePhoneNumber } from '../utils/security.js';

/**
 * Post-Login Details & Location Dialog Modal
 * Appears immediately after login so user enters their mobile number and address.
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
    <div class="modal-backdrop open" id="post-login-onboarding-wrap" style="z-index: 10000;">
      <div class="modal-card" style="max-width: 480px; width: 92%; padding: 32px 26px; border-radius: 20px; box-shadow: 0 20px 60px rgba(18, 45, 37, 0.25);">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 22px;">
          <div style="width: 52px; height: 52px; margin: 0 auto 12px; background: rgba(18, 45, 37, 0.06); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--color-primary);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <h3 style="font-family: var(--font-heading); color: var(--color-primary); font-size: 1.45rem; font-weight: 800; margin-bottom: 6px;">
            Enter Your Contact & Address
          </h3>
          <p style="color: var(--color-text-subtle); font-size: 0.88rem; line-height: 1.45; margin: 0;">
            Please provide your WhatsApp contact number and delivery address for order confirmations and doorstep delivery.
          </p>
        </div>

        <!-- Onboarding Form -->
        <form id="post-login-onboarding-form">
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" for="onboard-name" style="font-weight: 700; font-size: 0.88rem;">Your Full Name *</label>
            <input 
              type="text" 
              class="form-input" 
              id="onboard-name" 
              placeholder="e.g. Ram Bahadur" 
              value="${escapeHtml(currentName)}" 
              required
            >
          </div>

          <div class="form-group" style="margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <label class="form-label" for="onboard-phone" style="font-weight: 700; font-size: 0.88rem; margin: 0;">WhatsApp / Mobile Number *</label>
              <span style="font-size: 0.72rem; color: var(--color-primary); background: rgba(18, 45, 37, 0.08); padding: 2px 8px; border-radius: 99px; font-weight: 700;">10-Digit Mobile</span>
            </div>
            <input 
              type="tel" 
              class="form-input phone-highlight" 
              id="onboard-phone" 
              placeholder="e.g. 98XXXXXXXX" 
              value="${escapeHtml(currentPhone)}" 
              required
            >
            <span style="font-size: 0.76rem; color: var(--color-text-subtle); display: block; margin-top: 4px;">
              Used for WhatsApp order updates and courier dispatch.
            </span>
          </div>

          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" for="onboard-city" style="font-weight: 700; font-size: 0.88rem;">City / District *</label>
            <select class="form-input checkout-select" id="onboard-city" required>
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

          <div class="form-group" style="margin-bottom: 20px;">
            <label class="form-label" for="onboard-address" style="font-weight: 700; font-size: 0.88rem;">Delivery Address / Street / Landmark *</label>
            <input 
              type="text" 
              class="form-input" 
              id="onboard-address" 
              placeholder="e.g. Hasanpur, Ward 5, Near Chauraha" 
              value="${escapeHtml(currentAddress)}" 
              required
            >
          </div>

          <div>
            <button type="submit" class="btn btn-primary" id="onboard-submit-btn" style="width: 100%; padding: 13px; font-weight: 800; border-radius: 12px; font-size: 0.95rem;">
              Save & Continue
            </button>
          </div>
        </form>

      </div>
    </div>
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
