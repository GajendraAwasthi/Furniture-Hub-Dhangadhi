import { getCustomerOrders, updateCustomerProfile, logoutUser } from '../../services/customer-auth.js';
import { resolveCloudImageUrl } from '../../utils/cloud-image-resolver.js';

export function renderCustomerDashboardView(container, state, events, activeTab = 'orders') {
  const customer = state.customerUser;
  if (!customer) {
    events.emit('toast', { message: '🔒 Please sign in to access your customer dashboard.', type: 'danger' });
    events.emit('open-customer-auth');
    window.location.hash = '#home';
    return;
  }

  // Get orders strictly isolated to this specific customer
  const customerOrders = getCustomerOrders(customer.id);

  // Compute customer stats
  const totalSpent = customerOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const activeDeliveries = customerOrders.filter(o => (o.status || 'CONFIRMED').toUpperCase() !== 'DELIVERED').length;
  const wishlistCount = (state.wishlist || []).length;

  // Compute initials
  const nameParts = (customer.name || 'Valued Customer').trim().split(' ');
  const initials = nameParts.length > 1
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : (nameParts[0] ? nameParts[0].slice(0, 2).toUpperCase() : 'CU');

  container.innerHTML = `
    <div class="customer-dashboard-wrapper">
      <div class="customer-dashboard-container">
        <!-- Top Breadcrumbs -->
        <div class="cust-dash-breadcrumb">
          <a href="#home">Home</a>
          <span class="sep">/</span>
          <a href="#shop">Storefront</a>
          <span class="sep">/</span>
          <span class="current">Customer Dashboard</span>
        </div>

        <!-- Customer Welcome Hero Card -->
        <div class="cust-dash-hero">
          <div class="cust-dash-hero-profile">
            <div class="cust-dash-avatar">
              <span>${initials}</span>
            </div>
            <div class="cust-dash-hero-info">
              <div class="cust-dash-title-row">
                <h2>Welcome back, ${customer.name.trim().split(' ')[0]}!</h2>
                <span class="cust-dash-badge">Customer Account</span>
              </div>
              <p class="cust-dash-subtitle">
                ${customer.email} &bull; Member ID: <code style="background: rgba(18,45,37,0.06); padding: 2px 6px; border-radius: 4px;">${customer.id}</code>
              </p>
              <div class="cust-dash-wa-status">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/>
                </svg>
                <span>WhatsApp Delivery Sync: <strong>+${customer.phone || '9841234567'}</strong> (${customer.city || 'Kathmandu Valley'})</span>
              </div>
            </div>
          </div>

          <div class="cust-dash-hero-actions">
            <a href="#shop" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
              <span>Explore Collection</span>
            </a>
            <button type="button" id="cust-dash-signout-btn" class="btn btn-secondary btn-sm" style="color: #d32f2f; border-color: rgba(211, 47, 47, 0.25);">
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        <!-- 4 Summary Metrics Cards (Isolated to this customer) -->
        <div class="cust-dash-stats-grid">
          <div class="cust-stat-card">
            <div class="cust-stat-icon">📦</div>
            <div class="cust-stat-content">
              <span class="cust-stat-label">Total Orders</span>
              <strong class="cust-stat-val">${customerOrders.length}</strong>
            </div>
          </div>

          <div class="cust-stat-card">
            <div class="cust-stat-icon">🚚</div>
            <div class="cust-stat-content">
              <span class="cust-stat-label">In-Transit / Active</span>
              <strong class="cust-stat-val">${activeDeliveries}</strong>
            </div>
          </div>

          <div class="cust-stat-card">
            <div class="cust-stat-icon">💰</div>
            <div class="cust-stat-content">
              <span class="cust-stat-label">Total Investment</span>
              <strong class="cust-stat-val">Rs. ${totalSpent.toLocaleString()}/-</strong>
            </div>
          </div>

          <div class="cust-stat-card">
            <div class="cust-stat-icon">❤️</div>
            <div class="cust-stat-content">
              <span class="cust-stat-label">Saved Wishlist</span>
              <strong class="cust-stat-val">${wishlistCount} items</strong>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="cust-dash-tabs-bar">
          <button type="button" class="cust-dash-tab-btn ${activeTab === 'orders' ? 'active' : ''}" data-tab="orders">
            <span>📦 My Orders (${customerOrders.length})</span>
          </button>
          <button type="button" class="cust-dash-tab-btn ${activeTab === 'profile' ? 'active' : ''}" data-tab="profile">
            <span>👤 Delivery Address & WhatsApp</span>
          </button>
          <button type="button" class="cust-dash-tab-btn ${activeTab === 'wishlist' ? 'active' : ''}" data-tab="wishlist">
            <span>❤️ My Wishlist (${wishlistCount})</span>
          </button>
        </div>

        <!-- TAB CONTENT 1: MY ORDERS (Strictly Isolated to Customer) -->
        <div class="cust-dash-pane ${activeTab === 'orders' ? 'active' : ''}" id="cust-pane-orders">
          ${customerOrders.length === 0 ? `
            <div class="cust-empty-box">
              <div style="font-size: 3rem; margin-bottom: 12px;">🛋️</div>
              <h3 style="font-family: var(--font-heading); color: var(--color-primary); margin-bottom: 6px;">
                No Orders Placed Yet
              </h3>
              <p style="font-size: 0.9rem; color: var(--color-text-subtle); max-width: 480px; margin: 0 auto 20px;">
                When you order handcrafted furniture via WhatsApp, your verified delivery receipts and doorstep updates will appear exclusively in your dashboard.
              </p>
              <a href="#shop" class="btn btn-primary">
                <span>Start Shopping</span>
              </a>
            </div>
          ` : `
            <div class="cust-orders-list">
              ${customerOrders.map(order => `
                <div class="cust-order-card">
                  <div class="cust-order-header">
                    <div>
                      <span class="cust-order-ref">Order Reference: <strong>#${order.reference || order.id}</strong></span>
                      <span class="cust-order-date">${order.date || new Date().toLocaleDateString()}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="cust-status-badge status-${(order.status || 'CONFIRMED').toLowerCase().replace(/\s+/g, '-')}">
                        ${order.status || 'CONFIRMED'}
                      </span>
                    </div>
                  </div>

                  <div class="cust-order-items">
                    ${(order.items || []).map(item => `
                      <div class="cust-order-item-row">
                        <img src="${resolveCloudImageUrl(item.product?.image)}" alt="${item.product?.name || 'Item'}" class="cust-order-thumb" onerror="this.src='/images/hero-living-room.png'">
                        <div class="cust-order-item-info">
                          <h4>${item.product?.name || 'Furniture Item'}</h4>
                          <span class="cust-order-meta">Qty: ${item.quantity || 1} ${item.color ? `&bull; Color: ${item.color}` : ''}</span>
                        </div>
                        <div class="cust-order-item-price">
                          Rs. ${Number((item.product?.price || 0) * (item.quantity || 1)).toLocaleString()}/-
                        </div>
                      </div>
                    `).join('')}
                  </div>

                  <div class="cust-order-footer">
                    <div class="cust-order-delivery-info">
                      <span style="color: var(--color-text-subtle); font-size: 0.8rem;">Delivery To:</span>
                      <strong>${order.address || customer.address || 'Kathmandu Valley'}</strong>
                    </div>

                    <div style="display: flex; align-items: center; gap: 16px;">
                      <div style="text-align: right;">
                        <span style="font-size: 0.78rem; color: var(--color-text-subtle); display: block;">Total Amount</span>
                        <strong style="color: var(--color-primary); font-size: 1.15rem;">Rs. ${Number(order.total || 0).toLocaleString()}/-</strong>
                      </div>

                      ${order.whatsappUrl ? `
                        <a href="${order.whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="background: #25D366; color: white; border: none; padding: 8px 14px; font-weight: 700; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; text-decoration: none;">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/>
                          </svg>
                          <span>Track on WhatsApp</span>
                        </a>
                      ` : ''}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- TAB CONTENT 2: PROFILE & DELIVERY ADDRESS -->
        <div class="cust-dash-pane ${activeTab === 'profile' ? 'active' : ''}" id="cust-pane-profile">
          <div class="cust-profile-card">
            <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--color-primary); margin-bottom: 6px;">
              Verified Contact & Doorstep Delivery Address
            </h3>
            <p style="font-size: 0.85rem; color: var(--color-text-subtle); margin-bottom: 20px;">
              Keep your WhatsApp number and delivery location accurate. All white-glove deliveries and notifications use this profile.
            </p>

            <form id="cust-profile-edit-form">
              <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div class="form-group">
                  <label class="form-label" style="font-weight: 700;">Full Name *</label>
                  <input type="text" class="form-input" id="cp-name" required value="${customer.name || ''}" placeholder="e.g. Ram Bahadur Thapa">
                </div>

                <div class="form-group">
                  <label class="form-label" style="font-weight: 700;">Email Address (Read Only)</label>
                  <input type="email" class="form-input" id="cp-email" value="${customer.email || ''}" readonly style="background: rgba(18,45,37,0.04); cursor: not-allowed;">
                </div>
              </div>

              <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div class="form-group">
                  <div class="form-label-row">
                    <label class="form-label" style="font-weight: 700;">WhatsApp Mobile Number *</label>
                    <span class="phone-hint-badge">🇳🇵 10 digits</span>
                  </div>
                  <input type="tel" class="form-input phone-highlight" id="cp-phone" required value="${customer.phone || ''}" placeholder="e.g. 9848123456">
                </div>

                <div class="form-group">
                  <label class="form-label" style="font-weight: 700;">City / Delivery Region *</label>
                  <select class="form-input checkout-select" id="cp-city">
                    <option value="Dhangadhi" ${customer.city === 'Dhangadhi' || !customer.city ? 'selected' : ''}>Dhangadhi (Kailali)</option>
                    <option value="Attariya" ${customer.city === 'Attariya' ? 'selected' : ''}>Attariya (Kailali)</option>
                    <option value="Mahendranagar" ${customer.city === 'Mahendranagar' ? 'selected' : ''}>Mahendranagar (Kanchanpur)</option>
                    <option value="Tikapur" ${customer.city === 'Tikapur' ? 'selected' : ''}>Tikapur (Kailali)</option>
                    <option value="Dadeldhura" ${customer.city === 'Dadeldhura' ? 'selected' : ''}>Dadeldhura</option>
                    <option value="Nepalgunj" ${customer.city === 'Nepalgunj' ? 'selected' : ''}>Nepalgunj</option>
                    <option value="Kathmandu Valley" ${customer.city === 'Kathmandu Valley' ? 'selected' : ''}>Kathmandu Valley</option>
                    <option value="Other Sudurpashchim Region" ${customer.city === 'Other Sudurpashchim Region' ? 'selected' : ''}>Other Sudurpashchim Region</option>
                  </select>
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 20px;">
                <label class="form-label" style="font-weight: 700;">Default Street Address / Ward *</label>
                <input type="text" class="form-input" id="cp-address" required value="${customer.address || ''}" placeholder="e.g. Main Road, Ward 1, Dhangadhi">
              </div>

              <button type="submit" class="btn btn-primary" id="btn-save-cust-profile" style="padding: 13px 24px; font-weight: 800; border-radius: 12px; display: inline-flex; align-items: center; gap: 8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Save Profile Changes</span>
              </button>
            </form>
          </div>
        </div>

        <!-- TAB CONTENT 3: MY SAVED WISHLIST -->
        <div class="cust-dash-pane ${activeTab === 'wishlist' ? 'active' : ''}" id="cust-pane-wishlist">
          ${wishlistCount === 0 ? `
            <div class="cust-empty-box">
              <div style="font-size: 3rem; margin-bottom: 12px;">❤️</div>
              <h3 style="font-family: var(--font-heading); color: var(--color-primary); margin-bottom: 6px;">
                Your Wishlist is Empty
              </h3>
              <p style="font-size: 0.9rem; color: var(--color-text-subtle); max-width: 440px; margin: 0 auto 20px;">
                Save your favorite dining tables, accent chairs, and botanical decorations to review and order later.
              </p>
              <a href="#shop" class="btn btn-primary">
                <span>Browse Products</span>
              </a>
            </div>
          ` : `
            <div class="cust-wishlist-grid">
              ${(state.wishlist || []).map(pid => {
                const p = state.products.find(item => item.id === pid);
                if (!p) return '';
                return `
                  <div class="cust-wishlist-card">
                    <img src="${resolveCloudImageUrl(p.image)}" alt="${p.name}" class="cust-wishlist-img" onerror="this.src='/images/hero-living-room.png'">
                    <div class="cust-wishlist-details">
                      <span class="cust-wishlist-cat">${p.category}</span>
                      <h4>${p.name}</h4>
                      <div class="cust-wishlist-price">Rs. ${p.price.toLocaleString()}/-</div>
                    </div>
                    <div class="cust-wishlist-actions">
                      <button class="btn btn-primary btn-sm cust-wishlist-add-btn" data-id="${p.id}" style="width: 100%;">
                        <span>+ Add to Bag</span>
                      </button>
                      <button class="btn btn-secondary btn-sm cust-wishlist-remove-btn" data-id="${p.id}" style="width: 100%; color: #d32f2f;">
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  // Tab switching
  container.querySelectorAll('.cust-dash-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      renderCustomerDashboardView(container, state, events, tab);
    });
  });

  // Sign out buttons
  const signout1 = container.querySelector('#cust-dash-signout-btn');
  const signout2 = container.querySelector('#cust-dash-signout-btn-2');

  function handleSignOut() {
    events.emit('customer-logout');
  }

  if (signout1) signout1.addEventListener('click', handleSignOut);
  if (signout2) signout2.addEventListener('click', handleSignOut);

  // Profile edit submit
  const profileForm = container.querySelector('#cust-profile-edit-form');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newName = container.querySelector('#cp-name').value.trim();
      const newPhone = container.querySelector('#cp-phone').value.trim().replace(/[^0-9]/g, '');
      const newAddress = container.querySelector('#cp-address').value.trim();
      const newCity = container.querySelector('#cp-city').value;

      if (!newName || !newPhone || !newAddress) {
        events.emit('toast', { message: 'Please fill in all required fields.', type: 'danger' });
        return;
      }

      const updated = updateCustomerProfile({
        name: newName,
        phone: newPhone,
        address: newAddress,
        city: newCity
      });

      if (updated) {
        state.customerUser = updated;
        state.customerProfile = {
          name: updated.name,
          phone: updated.phone,
          address: updated.address,
          city: updated.city
        };
        localStorage.setItem('fh_customer_profile', JSON.stringify(state.customerProfile));
        events.emit('toast', { message: `✅ Delivery profile updated for ${updated.name}!`, type: 'success' });
        renderCustomerDashboardView(container, state, events, 'profile');
      }
    });
  }

  // Wishlist actions
  container.querySelectorAll('.cust-wishlist-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.id;
      const product = state.products.find(p => p.id === pid);
      if (product) {
        events.emit('add-to-cart', { product, quantity: 1 });
      }
    });
  });

  container.querySelectorAll('.cust-wishlist-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.id;
      events.emit('toggle-wishlist', pid);
      renderCustomerDashboardView(container, state, events, 'wishlist');
    });
  });
}
