import { 
  fetchStoreSettings, 
  saveStoreSettings, 
  fetchCoupons,
  saveCoupon,
  deleteCoupon
} from '../../services/supabase.js';
import { getSellerNumber, setSellerNumber, normalizeWhatsAppNumber } from '../../services/whatsapp.js';

export async function renderAdminSettingsView(container, state, events) {
  let settings = await fetchStoreSettings();
  let coupons = await fetchCoupons();

  let activeTab = 'general'; // 'general', 'coupons', 'catalog', 'system'

  function render() {
    container.innerHTML = `
      <div>
        <!-- Header -->
        <div style="margin-bottom: 24px;">
          <h1 style="font-size: 1.85rem; font-weight: 800; color: var(--color-primary); letter-spacing: -0.02em;">
            Store Configuration & Settings
          </h1>
          <p style="font-size: 0.9rem; color: var(--color-text-muted);">
            Manage store profile, promotional coupons, catalog display options, and inventory alerts.
          </p>
        </div>

        <!-- Settings Navigation Tabs -->
        <div class="settings-nav-tabs">
          <button class="settings-tab-btn ${activeTab === 'general' ? 'active' : ''}" data-tab="general">
            🏢 Store Profile
          </button>
          <button class="settings-tab-btn ${activeTab === 'coupons' ? 'active' : ''}" data-tab="coupons">
            🏷️ Discount Coupons
          </button>
          <button class="settings-tab-btn ${activeTab === 'catalog' ? 'active' : ''}" data-tab="catalog">
            🎨 Catalog & Display
          </button>
          <button class="settings-tab-btn ${activeTab === 'system' ? 'active' : ''}" data-tab="system">
            ⚠️ Alerts & System
          </button>
        </div>

        <!-- Tab Content Container -->
        <div class="admin-card" style="padding: 32px 30px;">
          ${renderTabContent()}
        </div>
      </div>
    `;

    // Attach tab click listeners
    container.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        render();
        attachEventListeners();
      });
    });

    attachEventListeners();
  }

  function renderTabContent() {
    // 1. STORE PROFILE
    if (activeTab === 'general') {
      const activeWa = getSellerNumber();
      return `
        <div>
          <!-- Dedicated WhatsApp Configuration Card -->
          <div style="background: rgba(37, 211, 102, 0.08); border: 2px solid #25D366; border-radius: 12px; padding: 22px; margin-bottom: 28px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="background: #25D366; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 3px 8px rgba(37, 211, 102, 0.4);">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/>
                  </svg>
                </div>
                <div>
                  <h3 style="font-size: 1.15rem; font-weight: 800; color: #122d25; margin: 0;">Store WhatsApp Order Receiver</h3>
                  <p style="font-size: 0.85rem; color: #2e7d32; margin: 2px 0 0; font-weight: 500;">
                    All customer orders and inquiries are routed directly to this mobile phone number.
                  </p>
                </div>
              </div>
              <span class="status-badge delivered" style="font-size: 0.8rem; padding: 4px 10px;">🟢 Live & Active</span>
            </div>

            <div style="display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-top: 14px;">
              <div style="flex: 1; min-width: 260px;">
                <label class="settings-label" for="st-whatsapp-quick" style="font-weight: 700; color: #122d25;">
                  Order Receiver WhatsApp Mobile Number *
                </label>
                <input type="text" id="st-whatsapp-quick" class="settings-input" style="font-size: 1.05rem; font-weight: 700; letter-spacing: 0.5px; border: 1.5px solid #25D366; background: #ffffff;" placeholder="e.g. 9841234567 or 9779841234567" value="${activeWa}">
                <span style="font-size: 0.78rem; color: var(--color-text-subtle); display: block; margin-top: 4px;">
                  💡 Enter standard 10-digit Nepal mobile (e.g. 9841234567) or with country code (9779841234567).
                </span>
              </div>
              <button type="button" class="btn" id="btn-save-whatsapp-quick" style="background: #25D366; color: white; font-weight: 700; border: none; padding: 12px 22px; border-radius: var(--radius-sm); cursor: pointer; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.35);">
                Save WhatsApp Number
              </button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-test-whatsapp-link" style="padding: 12px 16px;">
                📱 Test WhatsApp Link
              </button>
            </div>

            <div style="margin-top: 12px; font-size: 0.82rem; color: #075e54; font-family: monospace; background: rgba(255,255,255,0.85); padding: 8px 12px; border-radius: 6px; border: 1px dashed rgba(37,211,102,0.4);">
              Target WhatsApp Deep Link: <span id="st-whatsapp-preview">https://wa.me/${activeWa}</span>
            </div>
          </div>

          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--color-primary); margin-bottom: 6px;">
            Store Profile & Operating Details
          </h2>
          <p style="font-size: 0.88rem; color: var(--color-text-muted); margin-bottom: 24px;">
            Store name, contact channels, and Dhangadhi fulfillment center address.
          </p>

          <form id="form-general-settings">
            <div class="settings-form-grid">
              <div class="settings-form-group">
                <label class="settings-label" for="st-name">Store Name *</label>
                <input type="text" id="st-name" class="settings-input" value="${settings.storeName || 'Furniture Hub Dhangadhi'}" required>
              </div>

              <div class="settings-form-group">
                <label class="settings-label" for="st-currency">Currency Symbol / Code *</label>
                <input type="text" id="st-currency" class="settings-input" value="${settings.currency || 'Rs.'}" required>
              </div>

              <div class="settings-form-group">
                <label class="settings-label" for="st-email">Support Email *</label>
                <input type="email" id="st-email" class="settings-input" value="${settings.contactEmail || 'support@furniturehubdhangadhi.com'}" required>
              </div>

              <div class="settings-form-group">
                <label class="settings-label" for="st-phone">Customer Helpline / Mobile *</label>
                <input type="text" id="st-phone" class="settings-input" value="${settings.phone || '+977 9841234567'}" required>
              </div>

              <div class="settings-form-group">
                <label class="settings-label" for="st-whatsapp" style="display: flex; align-items: center; gap: 6px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/></svg>
                  <span>Store WhatsApp Number (Order Receiver) *</span>
                </label>
                <input type="text" id="st-whatsapp" class="settings-input" placeholder="e.g. 9779841234567 or 9841234567" value="${activeWa}" required>
              </div>

              <div class="settings-form-group full-width">
                <label class="settings-label" for="st-address">Main Warehouse & Showroom Address</label>
                <input type="text" id="st-address" class="settings-input" value="${settings.address || 'Main Road, Ward 1, Dhangadhi, Kailali, Nepal'}" required>
              </div>

              <div class="settings-form-group full-width">
                <label class="settings-label" for="st-hours">Operating & Delivery Window</label>
                <input type="text" id="st-hours" class="settings-input" value="${settings.operatingHours || 'Sun - Fri, 9:00 AM - 7:00 PM'}" required>
              </div>
            </div>

            <div style="margin-top: 24px; text-align: right;">
              <button type="submit" class="btn btn-primary btn-sm">Save Store Profile</button>
            </div>
          </form>
        </div>
      `;
    }

    // 2. DISCOUNT COUPONS
    if (activeTab === 'coupons') {
      return `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
              <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--color-primary); margin-bottom: 4px;">
                Promotional Coupons & Discounts
              </h2>
              <p style="font-size: 0.88rem; color: var(--color-text-muted);">
                Create and manage promo codes available for customers at checkout.
              </p>
            </div>
          </div>

          <!-- Existing Coupons List -->
          <div class="admin-table-wrap" style="margin-bottom: 30px;">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Coupon Code</th>
                  <th>Discount</th>
                  <th>Min Order Spend</th>
                  <th>Usage Count</th>
                  <th>Status</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${coupons.map(c => `
                  <tr>
                    <td><strong style="font-family: monospace; font-size: 1rem; color: var(--color-primary);">${c.code}</strong></td>
                    <td><strong>${c.discountPercent}% OFF</strong></td>
                    <td>Rs. ${(c.minOrderAmount || 0).toLocaleString()}</td>
                    <td>${c.usageCount || 0} times</td>
                    <td>
                      <span class="status-badge ${c.isActive ? 'delivered' : 'cancelled'}">
                        ${c.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button class="action-icon-btn danger btn-del-coupon" data-code="${c.code}" title="Delete coupon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Add New Coupon Form -->
          <div style="background: var(--color-bg-light); border-radius: 12px; padding: 22px; border: 1px solid rgba(18,45,37,0.08);">
            <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--color-primary); margin-bottom: 14px;">
              Create New Coupon Code
            </h3>
            <form id="form-add-coupon">
              <div class="settings-form-grid">
                <div class="settings-form-group">
                  <label class="settings-label" for="cp-code">Coupon Code *</label>
                  <input type="text" id="cp-code" class="settings-input" placeholder="e.g. FESTIVE20" style="text-transform: uppercase;" required>
                </div>

                <div class="settings-form-group">
                  <label class="settings-label" for="cp-pct">Discount Percentage (%) *</label>
                  <input type="number" id="cp-pct" class="settings-input" placeholder="15" min="1" max="90" required>
                </div>

                <div class="settings-form-group">
                  <label class="settings-label" for="cp-min">Minimum Order Spend (NPR)</label>
                  <input type="number" id="cp-min" class="settings-input" placeholder="5000" min="0" value="0">
                </div>

                <div class="settings-form-group" style="justify-content: flex-end;">
                  <button type="submit" class="btn btn-primary btn-sm" style="height: 44px;">
                    + Add Promo Coupon
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    // 3. CATALOG & STOREFRONT DISPLAY
    if (activeTab === 'catalog') {
      return `
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--color-primary); margin-bottom: 6px;">
            Catalog & Storefront Display
          </h2>
          <p style="font-size: 0.88rem; color: var(--color-text-muted); margin-bottom: 24px;">
            Control customer-facing catalog sorting, badges, pagination, and storefront highlights.
          </p>

          <form id="form-catalog-settings">
            <div class="settings-form-grid" style="margin-bottom: 24px;">
              <div class="settings-form-group">
                <label class="settings-label" for="cat-per-page">Products Per Page</label>
                <select id="cat-per-page" class="settings-select">
                  <option value="6" ${settings.productsPerPage === 6 ? 'selected' : ''}>6 items</option>
                  <option value="8" ${settings.productsPerPage === 8 || !settings.productsPerPage ? 'selected' : ''}>8 items (Default)</option>
                  <option value="12" ${settings.productsPerPage === 12 ? 'selected' : ''}>12 items</option>
                  <option value="16" ${settings.productsPerPage === 16 ? 'selected' : ''}>16 items</option>
                </select>
              </div>

              <div class="settings-form-group">
                <label class="settings-label" for="cat-sort">Default Catalog Sort Order</label>
                <select id="cat-sort" class="settings-select">
                  <option value="featured" ${settings.defaultSort === 'featured' || !settings.defaultSort ? 'selected' : ''}>Featured / Popular</option>
                  <option value="price-asc" ${settings.defaultSort === 'price-asc' ? 'selected' : ''}>Price: Low to High</option>
                  <option value="price-desc" ${settings.defaultSort === 'price-desc' ? 'selected' : ''}>Price: High to Low</option>
                  <option value="rating" ${settings.defaultSort === 'rating' ? 'selected' : ''}>Customer Rating ★</option>
                </select>
              </div>

              <div class="settings-form-group">
                <label class="settings-label">Stock Availability Badges</label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-top: 8px;">
                  <input type="checkbox" id="cat-show-stock" ${settings.showStockBadge !== false ? 'checked' : ''} style="width: 18px; height: 18px;">
                  <span style="font-weight: 600;">Display 'In Stock' / 'Low Stock' pills on cards</span>
                </label>
              </div>

              <div class="settings-form-group">
                <label class="settings-label">Customer Reviews & Ratings</label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-top: 8px;">
                  <input type="checkbox" id="cat-show-reviews" ${settings.showReviews !== false ? 'checked' : ''} style="width: 18px; height: 18px;">
                  <span style="font-weight: 600;">Display star ratings & review counts</span>
                </label>
              </div>

              <div class="settings-form-group full-width">
                <label class="settings-label" for="cat-hero-text">Storefront Hero Highlight Subtitle</label>
                <input 
                  type="text" 
                  id="cat-hero-text" 
                  class="settings-input" 
                  value="${settings.heroSubtitle || 'Browse through our diverse range of meticulously crafted furnitures in Nepal.'}"
                >
              </div>
            </div>

            <div style="margin-top: 24px; text-align: right;">
              <button type="submit" class="btn btn-primary btn-sm">Save Catalog Settings</button>
            </div>
          </form>
        </div>
      `;
    }

    // 4. SYSTEM & ALERTS
    if (activeTab === 'system') {
      return `
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--color-primary); margin-bottom: 6px;">
            Inventory Thresholds & System Controls
          </h2>
          <p style="font-size: 0.88rem; color: var(--color-text-muted); margin-bottom: 24px;">
            Configure stock warning limits, store maintenance mode, and local cache controls.
          </p>

          <form id="form-system-settings">
            <div class="settings-form-grid">
              <div class="settings-form-group">
                <label class="settings-label" for="low-stock-limit">Low-Stock Warning Threshold</label>
                <input type="number" id="low-stock-limit" class="settings-input" value="${settings.lowStockThreshold ?? 3}" min="1" max="50">
                <span style="font-size: 0.78rem; color: var(--color-text-subtle);">Products with remaining units below this number trigger inventory alert badges.</span>
              </div>

              <div class="settings-form-group">
                <label class="settings-label">Store Maintenance Mode</label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-top: 8px;">
                  <input type="checkbox" id="st-maintenance" ${settings.maintenanceMode ? 'checked' : ''} style="width: 18px; height: 18px;">
                  <span style="font-weight: 600;">Enable Maintenance Banner on Public Store</span>
                </label>
              </div>
            </div>

            <div style="margin-top: 24px; text-align: right;">
              <button type="submit" class="btn btn-primary btn-sm">Save System Settings</button>
            </div>
          </form>

          <hr style="border: none; border-top: 1px solid rgba(18,45,37,0.08); margin: 30px 0;">

          <!-- Reset / Clear Local Storage Cache -->
          <div>
            <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--color-primary); margin-bottom: 8px;">
              Reset Local Storage Cache
            </h3>
            <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 14px;">
              Restores local sample products and order fixtures to original defaults.
            </p>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-cache">
              Reset Local Data to Defaults
            </button>
          </div>
        </div>
      `;
    }

    return '';
  }

  function attachEventListeners() {
    // 0. Dedicated WhatsApp Quick Save & Test
    const quickWaInput = container.querySelector('#st-whatsapp-quick');
    const quickWaSaveBtn = container.querySelector('#btn-save-whatsapp-quick');
    const quickWaTestBtn = container.querySelector('#btn-test-whatsapp-link');
    const quickWaPreview = container.querySelector('#st-whatsapp-preview');
    const formWaInput = container.querySelector('#st-whatsapp');

    if (quickWaInput) {
      quickWaInput.addEventListener('input', () => {
        const norm = normalizeWhatsAppNumber(quickWaInput.value);
        if (quickWaPreview) quickWaPreview.textContent = `https://wa.me/${norm}`;
        if (formWaInput) formWaInput.value = norm;
      });
    }

    if (quickWaSaveBtn && quickWaInput) {
      quickWaSaveBtn.addEventListener('click', async () => {
        const raw = quickWaInput.value.trim();
        const clean = normalizeWhatsAppNumber(raw);
        setSellerNumber(clean);
        quickWaInput.value = clean;
        if (formWaInput) formWaInput.value = clean;
        if (quickWaPreview) quickWaPreview.textContent = `https://wa.me/${clean}`;

        const updated = {
          ...settings,
          whatsappNumber: clean
        };
        await saveStoreSettings(updated);
        settings = updated;
        events.emit('toast', { 
          message: `✅ Store WhatsApp receiver updated to +${clean}! All orders will now route to this number.`, 
          type: 'success' 
        });

        // Update top-bar badge if present
        const topBadge = document.querySelector('.admin-wa-badge span:first-of-type');
        if (topBadge) {
          topBadge.textContent = `WA: +${clean}`;
        }
      });
    }

    if (quickWaTestBtn && quickWaInput) {
      quickWaTestBtn.addEventListener('click', () => {
        const clean = normalizeWhatsAppNumber(quickWaInput.value);
        const testUrl = `https://wa.me/${clean}?text=${encodeURIComponent('Hello Furniture Hub Dhangadhi! This is a test message from your Admin Dashboard verifying the WhatsApp order receiving connection.')}`;
        window.open(testUrl, '_blank', 'noopener,noreferrer');
      });
    }

    // 1. General Settings Form
    const genForm = container.querySelector('#form-general-settings');
    if (genForm) {
      genForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const waVal = container.querySelector('#st-whatsapp') ? container.querySelector('#st-whatsapp').value.trim() : '9779841234567';
        const cleanWa = normalizeWhatsAppNumber(waVal);
        setSellerNumber(cleanWa);

        const updated = {
          ...settings,
          storeName: container.querySelector('#st-name').value.trim(),
          currency: container.querySelector('#st-currency').value.trim(),
          contactEmail: container.querySelector('#st-email').value.trim(),
          phone: container.querySelector('#st-phone').value.trim(),
          whatsappNumber: cleanWa,
          address: container.querySelector('#st-address').value.trim(),
          operatingHours: container.querySelector('#st-hours').value.trim()
        };
        await saveStoreSettings(updated);
        settings = updated;
        events.emit('toast', { message: `Store profile & WhatsApp number (+${cleanWa}) saved!`, type: 'success' });
      });
    }

    // 2. Add Coupon Form
    const cpForm = container.querySelector('#form-add-coupon');
    if (cpForm) {
      cpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newCp = {
          code: container.querySelector('#cp-code').value.trim().toUpperCase(),
          discountPercent: Number(container.querySelector('#cp-pct').value),
          minOrderAmount: Number(container.querySelector('#cp-min').value) || 0,
          isActive: true,
          usageCount: 0
        };
        await saveCoupon(newCp);
        coupons = await fetchCoupons();
        events.emit('toast', { message: `Coupon "${newCp.code}" created!`, type: 'success' });
        render();
      });
    }

    // Delete coupon buttons
    container.querySelectorAll('.btn-del-coupon').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.dataset.code;
        if (confirm(`Delete coupon "${code}"?`)) {
          await deleteCoupon(code);
          coupons = await fetchCoupons();
          events.emit('toast', { message: `Coupon "${code}" removed`, type: 'info' });
          render();
        }
      });
    });

    // 3. Catalog Settings Form
    const catForm = container.querySelector('#form-catalog-settings');
    if (catForm) {
      catForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updated = {
          ...settings,
          productsPerPage: Number(container.querySelector('#cat-per-page').value),
          defaultSort: container.querySelector('#cat-sort').value,
          showStockBadge: container.querySelector('#cat-show-stock').checked,
          showReviews: container.querySelector('#cat-show-reviews').checked,
          heroSubtitle: container.querySelector('#cat-hero-text').value.trim()
        };
        await saveStoreSettings(updated);
        settings = updated;
        events.emit('toast', { message: 'Catalog display settings saved!', type: 'success' });
      });
    }

    // 4. System Settings Form
    const sysForm = container.querySelector('#form-system-settings');
    if (sysForm) {
      sysForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updated = {
          ...settings,
          lowStockThreshold: Number(container.querySelector('#low-stock-limit').value),
          maintenanceMode: container.querySelector('#st-maintenance').checked
        };
        await saveStoreSettings(updated);
        settings = updated;
        events.emit('toast', { message: 'System & inventory thresholds saved!', type: 'success' });
      });
    }

    // Reset cache button
    const resetCacheBtn = container.querySelector('#btn-reset-cache');
    if (resetCacheBtn) {
      resetCacheBtn.addEventListener('click', () => {
        if (confirm('Reset local storage cache? This will restore original sample products and orders.')) {
          localStorage.removeItem('fh_local_products');
          localStorage.removeItem('fh_local_orders');
          localStorage.removeItem('fh_local_settings');
          localStorage.removeItem('fh_local_coupons');
          events.emit('toast', { message: 'Local cache reset to defaults', type: 'info' });
          window.location.reload();
        }
      });
    }
  }

  render();
}
