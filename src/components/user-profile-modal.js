import { normalizeWhatsAppNumber } from '../services/whatsapp.js';
import { getCustomerOrders } from '../services/customer-auth.js';

export function renderUserProfileModal(container, state, events) {
  const customer = state.customerUser;
  const profile = state.customerProfile || {
    name: customer?.name || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    city: customer?.city || 'Dhangadhi'
  };

  const storedOrders = getCustomerOrders();
  // Merge state.lastOrder if not already in storedOrders
  const allOrders = [...storedOrders];
  if (state.lastOrder && !allOrders.some(o => o.id === state.lastOrder.id)) {
    allOrders.unshift(state.lastOrder);
  }

  // Calculate initials
  const rawName = (customer?.name || profile.name || 'Valued Customer').trim();
  const nameParts = rawName.split(' ');
  const initials = nameParts.length > 1 
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : (nameParts[0] ? nameParts[0].slice(0, 2).toUpperCase() : 'CU');

  const activeTab = state.profileActiveTab || 'details'; // 'details' or 'orders'

  container.innerHTML = `
    <!-- User Profile Backdrop -->
    <div class="modal-backdrop ${state.isProfileOpen ? 'open' : ''}" id="user-profile-backdrop">
      <div class="modal-card customer-profile-card" style="max-width: 520px;">
        <!-- Header -->
        <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid rgba(18, 45, 37, 0.08);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="customer-avatar-badge">
              <span>${initials}</span>
            </div>
            <div>
              <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary); margin: 0; line-height: 1.2;">
                ${customer ? customer.name : (profile.name || 'Customer Account')}
              </h3>
              <span style="font-size: 0.8rem; color: var(--color-text-subtle);">
                ${customer ? customer.email : 'Customer Account'}
              </span>
            </div>
          </div>
          <button class="btn-icon" id="user-profile-close-btn" aria-label="Close profile">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Verified WhatsApp Channel Banner -->
        <div style="background: rgba(37, 211, 102, 0.1); border: 1.5px solid #25D366; border-radius: 12px; padding: 12px 16px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#25D366">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/>
            </svg>
            <div>
              <div style="font-weight: 700; font-size: 0.9rem; color: #075e54;">
                WhatsApp Contact: <strong>${profile.phone || 'Not configured'}</strong>
              </div>
              <div style="font-size: 0.76rem; color: #2e7d32;">
                Used for dispatch notifications and delivery confirmation
              </div>
            </div>
          </div>
          <span style="font-size: 0.75rem; background: ${profile.phone ? '#25D366' : '#94a3b8'}; color: white; padding: 3px 10px; border-radius: 12px; font-weight: 700;">
            ${profile.phone ? 'Connected' : 'Pending'}
          </span>
        </div>

        <!-- Profile Sub-Tabs -->
        <div class="cauth-tabs" style="margin-bottom: 18px;">
          <button type="button" class="cauth-tab ${activeTab === 'details' ? 'active' : ''}" id="tab-profile-details">
            <span>Contact & Address</span>
          </button>
          <button type="button" class="cauth-tab ${activeTab === 'orders' ? 'active' : ''}" id="tab-profile-orders">
            <span>My Orders (${allOrders.length})</span>
          </button>
        </div>

        <!-- TAB 1: DETAILS & EDIT -->
        <div id="pane-profile-details" style="${activeTab === 'details' ? 'display: block;' : 'display: none;'}">
          <form id="user-profile-form">
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="font-weight: 700;">Full Name *</label>
              <input type="text" class="form-input" id="up-name" required placeholder="e.g. Ram Bahadur" value="${profile.name || ''}">
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="font-weight: 700;">WhatsApp Mobile Number *</label>
              <input type="tel" class="form-input phone-highlight" id="up-phone" required placeholder="e.g. 98XXXXXXXX" value="${profile.phone || ''}">
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="font-weight: 700;">Default Delivery Address *</label>
              <input type="text" class="form-input" id="up-address" required placeholder="e.g. Hasanpur Ward 5, Near Chauraha" value="${profile.address || ''}">
            </div>

            <div class="form-group" style="margin-bottom: 18px;">
              <label class="form-label" style="font-weight: 700;">City / Region *</label>
              <select class="form-input checkout-select" id="up-city">
                <option value="Dhangadhi" ${profile.city === 'Dhangadhi' ? 'selected' : ''}>Dhangadhi (Kailali)</option>
                <option value="Attariya" ${profile.city === 'Attariya' ? 'selected' : ''}>Attariya (Kailali)</option>
                <option value="Tikapur" ${profile.city === 'Tikapur' ? 'selected' : ''}>Tikapur (Kailali)</option>
                <option value="Mahendranagar" ${profile.city === 'Mahendranagar' ? 'selected' : ''}>Mahendranagar (Kanchanpur)</option>
                <option value="Dadeldhura" ${profile.city === 'Dadeldhura' ? 'selected' : ''}>Dadeldhura</option>
                <option value="Kathmandu Valley" ${profile.city === 'Kathmandu Valley' ? 'selected' : ''}>Kathmandu Valley</option>
                <option value="Other Sudurpashchim" ${profile.city === 'Other Sudurpashchim' ? 'selected' : ''}>Other Sudurpashchim</option>
                <option value="Other Nepal" ${profile.city === 'Other Nepal' ? 'selected' : ''}>Other Nepal</option>
              </select>
            </div>

            <button type="submit" class="btn btn-primary" id="btn-save-user-profile" style="width: 100%; padding: 13px; font-weight: 800; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Save Contact Profile</span>
            </button>
          </form>
        </div>

        <!-- TAB 2: MY ORDERS HISTORY -->
        <div id="pane-profile-orders" style="${activeTab === 'orders' ? 'display: block;' : 'display: none;'}">
          ${allOrders.length === 0 ? `
            <div style="text-align: center; padding: 32px 16px; color: var(--color-text-muted);">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; opacity: 0.7;">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <h4 style="font-family: var(--font-heading); color: var(--color-primary); margin-bottom: 4px;">No Orders Yet</h4>
              <p style="font-size: 0.85rem;">When you order via WhatsApp, your verified delivery receipts will appear here.</p>
            </div>
          ` : `
            <div class="customer-orders-list" style="max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 4px;">
              ${allOrders.map(order => `
                <div class="customer-order-card" style="background: var(--color-bg-light); border: 1px solid rgba(18, 45, 37, 0.08); border-radius: 12px; padding: 14px 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div>
                      <strong style="font-family: monospace; font-size: 0.95rem; color: var(--color-primary);">#${order.id}</strong>
                      <div style="font-size: 0.76rem; color: var(--color-text-subtle);">${order.date || 'Recent'}</div>
                    </div>
                    <span style="background: rgba(37, 211, 102, 0.15); color: #075e54; font-size: 0.74rem; font-weight: 800; padding: 2px 8px; border-radius: 10px;">
                      WhatsApp Dispatched
                    </span>
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(18, 45, 37, 0.08);">
                    <div>
                      <span style="font-size: 0.78rem; color: var(--color-text-subtle);">Total:</span>
                      <strong style="color: var(--color-primary); font-size: 1rem; margin-left: 4px;">Rs. ${Number(order.total || 0).toLocaleString()}/-</strong>
                    </div>
                    ${order.whatsappUrl ? `
                      <a href="${order.whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="background: #25D366; color: white; text-decoration: none; padding: 6px 12px; font-size: 0.78rem; font-weight: 700; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
                        <span>Open WhatsApp</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </a>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Footer Actions: Logout -->
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(18, 45, 37, 0.08); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <button type="button" id="btn-customer-logout" class="btn btn-secondary btn-sm" style="color: #d32f2f; border-color: rgba(211, 47, 47, 0.25); background: rgba(211, 47, 47, 0.04); font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            <span>Sign Out</span>
          </button>

          <span style="font-size: 0.78rem; color: var(--color-text-subtle); display: inline-flex; align-items: center; gap: 5px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>Encrypted Delivery Portal</span>
          </span>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  const backdrop = container.querySelector('#user-profile-backdrop');
  const closeBtn = container.querySelector('#user-profile-close-btn');

  function closeProfile() {
    events.emit('close-profile');
  }

  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeProfile();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', closeProfile);

  // Tab switching
  const tabDetails = container.querySelector('#tab-profile-details');
  const tabOrders = container.querySelector('#tab-profile-orders');

  if (tabDetails) {
    tabDetails.addEventListener('click', () => {
      state.profileActiveTab = 'details';
      renderUserProfileModal(container, state, events);
    });
  }
  if (tabOrders) {
    tabOrders.addEventListener('click', () => {
      state.profileActiveTab = 'orders';
      renderUserProfileModal(container, state, events);
    });
  }

  // Logout button
  const logoutBtn = container.querySelector('#btn-customer-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      closeProfile();
      events.emit('customer-logout');
    });
  }


  const form = container.querySelector('#user-profile-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const phoneVal = container.querySelector('#up-phone').value.trim();
      const nameVal = container.querySelector('#up-name').value.trim();
      const addressVal = container.querySelector('#up-address').value.trim();
      const cityVal = container.querySelector('#up-city').value;

      const cleanPhone = phoneVal.replace(/[^0-9]/g, '');

      events.emit('update-user-profile', {
        phone: cleanPhone,
        name: nameVal,
        address: addressVal,
        city: cityVal
      });

      closeProfile();
    });
  }
}
