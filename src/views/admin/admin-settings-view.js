import { 
  fetchStoreSettings, 
  saveStoreSettings, 
  fetchCategories,
  saveCategory,
  deleteCategory,
  fetchCoupons,
  saveCoupon,
  deleteCoupon,
  getClient
} from '../../services/supabase.js';
import { getSellerNumber, setSellerNumber, setCloudSellerNumber, normalizeWhatsAppNumber } from '../../services/whatsapp.js';
import { escapeHtml } from '../../utils/security.js';

export async function renderAdminSettingsView(container, state, events, defaultTab = 'general') {
  let settings = await fetchStoreSettings();
  let coupons = await fetchCoupons();
  let editingCategory = null;

  let activeTab = defaultTab || 'general'; // 'general', 'categories', 'coupons', 'catalog', 'system'

  function render() {
    const categoriesCount = Array.isArray(settings.categories) ? settings.categories.length : 0;
    container.innerHTML = `
      <div>
        <!-- Header -->
        <div style="margin-bottom: 24px;">
          <h1 style="font-size: 1.85rem; font-weight: 800; color: var(--color-primary); letter-spacing: -0.02em;">
            Store Configuration & Settings
          </h1>
          <p style="font-size: 0.9rem; color: var(--color-text-muted);">
            Manage store profile, custom product categories, promotional coupons, catalog display options, and inventory alerts.
          </p>
        </div>

        <!-- Settings Navigation Tabs -->
        <div class="settings-nav-tabs">
          <button class="settings-tab-btn ${activeTab === 'general' ? 'active' : ''}" data-tab="general">
            🏢 Store Profile
          </button>
          <button class="settings-tab-btn ${activeTab === 'categories' ? 'active' : ''}" data-tab="categories">
            📂 Categories (${categoriesCount})
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
                <input type="text" id="st-name" class="settings-input" value="${escapeHtml(settings.storeName || 'Furniture Hub Dhangadhi')}" required>
              </div>

              <div class="settings-form-group">
                <label class="settings-label" for="st-currency">Currency Symbol / Code *</label>
                <input type="text" id="st-currency" class="settings-input" value="${escapeHtml(settings.currency || 'Rs.')}" required>
              </div>

              <div class="settings-form-group">
                <label class="settings-label" for="st-email">Support Email *</label>
                <input type="email" id="st-email" class="settings-input" value="${escapeHtml(settings.contactEmail || 'support@furniturehubdhangadhi.com')}" required>
              </div>

              <div class="settings-form-group">
                <label class="settings-label" for="st-phone">Customer Helpline / Mobile *</label>
                <input type="text" id="st-phone" class="settings-input" value="${escapeHtml(settings.phone || '+977 9841234567')}" required>
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
                <input type="text" id="st-address" class="settings-input" value="${escapeHtml(settings.address || 'Main Road, Ward 1, Dhangadhi, Kailali, Nepal')}" required>
              </div>

              <div class="settings-form-group full-width">
                <label class="settings-label" for="st-hours">Operating & Delivery Window</label>
                <input type="text" id="st-hours" class="settings-input" value="${escapeHtml(settings.operatingHours || 'Sun - Fri, 9:00 AM - 7:00 PM')}" required>
              </div>
            </div>

            <div style="margin-top: 24px; text-align: right;">
              <button type="submit" class="btn btn-primary btn-sm">Save Store Profile</button>
            </div>
          </form>
        </div>
      `;
    }

    // 2. STORE CATEGORIES
    if (activeTab === 'categories') {
      const categoriesList = Array.isArray(settings.categories) ? settings.categories : [];
      const products = Array.isArray(state?.products) ? state.products : [];

      return `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
            <div>
              <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--color-primary); margin-bottom: 4px;">
                Catalog Categories Management
              </h2>
              <p style="font-size: 0.88rem; color: var(--color-text-muted);">
                Create custom categories, set icons, and organize your furniture catalog. Changes automatically update across the entire storefront, navbar, shop filters, and product forms.
              </p>
            </div>
            <div style="background: rgba(18, 45, 37, 0.05); border: 1px solid rgba(18, 45, 37, 0.12); padding: 8px 14px; border-radius: 8px; font-size: 0.82rem; color: var(--color-primary); font-weight: 600;">
              🔒 Security Enforced: Admin Auth &amp; XSS Sanitization Active
            </div>
          </div>

          <!-- Categories List Table -->
          <div class="admin-table-wrap" style="margin-bottom: 30px;">
            <table class="admin-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Icon</th>
                  <th>Category Name</th>
                  <th>URL Slug</th>
                  <th>Description</th>
                  <th>Assigned Items</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${categoriesList.length === 0 ? `
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 36px 20px; color: var(--color-text-muted);">
                      <div style="font-size: 2.2rem; margin-bottom: 8px;">📂</div>
                      <div style="font-weight: 700; font-size: 1.05rem; color: var(--color-primary); margin-bottom: 4px;">No Categories Found</div>
                      <p style="font-size: 0.88rem; max-width: 480px; margin: 0 auto;">
                        All older hardcoded categories have been removed. Use the form below to create your own custom categories for your store.
                      </p>
                    </td>
                  </tr>
                ` : categoriesList.map(cat => {
                  const count = products.filter(p => p.category && (
                    p.category.toLowerCase() === cat.name.toLowerCase() ||
                    (cat.slug && p.category.toLowerCase() === cat.slug.toLowerCase())
                  )).length;
                  return `
                    <tr>
                      <td style="font-size: 1.4rem; text-align: center;">${escapeHtml(cat.icon || '🏷️')}</td>
                      <td>
                        <strong style="color: var(--color-primary); font-size: 0.95rem;">${escapeHtml(cat.name)}</strong>
                      </td>
                      <td>
                        <code style="background: rgba(0,0,0,0.04); padding: 3px 8px; border-radius: 4px; font-size: 0.82rem;">
                          ${escapeHtml(cat.slug || cat.name.toLowerCase().replace(/\\s+/g, '-'))}
                        </code>
                      </td>
                      <td style="font-size: 0.84rem; color: var(--color-text-muted); max-width: 220px;">
                        ${cat.description ? escapeHtml(cat.description) : '<em>None</em>'}
                      </td>
                      <td>
                        <span class="status-badge ${count > 0 ? 'delivered' : 'pending'}" style="font-size: 0.78rem;">
                          ${count} ${count === 1 ? 'Product' : 'Products'}
                        </span>
                      </td>
                      <td style="text-align: right; white-space: nowrap;">
                        <button type="button" class="btn btn-secondary btn-sm btn-edit-category" data-cat-id="${escapeHtml(cat.id || cat.slug)}" title="Edit Category" style="padding: 6px 12px; margin-right: 6px;">
                          ✏️ Edit
                        </button>
                        <button type="button" class="action-icon-btn danger btn-del-category" data-cat-id="${escapeHtml(cat.id || cat.slug)}" data-cat-name="${escapeHtml(cat.name)}" data-cat-count="${count}" title="Delete Category">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Add / Edit Category Form -->
          <div style="background: var(--color-bg-light); border-radius: 12px; padding: 24px; border: 1px solid rgba(18,45,37,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--color-primary); margin: 0;">
                ${editingCategory ? `✏️ Edit Category: "${escapeHtml(editingCategory.name)}"` : '➕ Create New Category'}
              </h3>
              ${editingCategory ? `
                <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-edit-cat" style="font-size: 0.8rem; padding: 4px 10px;">
                  Cancel Edit
                </button>
              ` : ''}
            </div>

            <form id="form-category">
              <input type="hidden" id="cat-edit-id" value="${editingCategory ? escapeHtml(editingCategory.id || editingCategory.slug) : ''}">
              <div class="settings-form-grid">
                <div class="settings-form-group">
                  <label class="settings-label" for="cat-name">Category Name *</label>
                  <input 
                    type="text" 
                    id="cat-name" 
                    class="settings-input" 
                    placeholder="e.g. Living Room, Executive Desks, Sofas" 
                    value="${editingCategory ? escapeHtml(editingCategory.name) : ''}" 
                    maxlength="50" 
                    required
                  >
                </div>

                <div class="settings-form-group">
                  <label class="settings-label" for="cat-slug">URL Slug (lowercase &amp; hyphens)</label>
                  <input 
                    type="text" 
                    id="cat-slug" 
                    class="settings-input" 
                    placeholder="e.g. living-room, executive-desks" 
                    value="${editingCategory ? escapeHtml(editingCategory.slug || '') : ''}" 
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                    title="Only lowercase letters, numbers, and hyphens"
                  >
                  <span style="font-size: 0.78rem; color: var(--color-text-subtle);">Leave empty to auto-generate from category name.</span>
                </div>

                <div class="settings-form-group">
                  <label class="settings-label" for="cat-icon">Icon / Emoji</label>
                  <input 
                    type="text" 
                    id="cat-icon" 
                    class="settings-input" 
                    placeholder="e.g. 🪑, 🛋️, 🪵, 🌿, 💡, 🚪" 
                    value="${editingCategory ? escapeHtml(editingCategory.icon || '🏷️') : '🏷️'}" 
                    maxlength="10"
                  >
                </div>

                <div class="settings-form-group full-width">
                  <label class="settings-label" for="cat-desc">Short Description (optional)</label>
                  <input 
                    type="text" 
                    id="cat-desc" 
                    class="settings-input" 
                    placeholder="Brief summary shown on category headers and catalog metadata" 
                    value="${editingCategory ? escapeHtml(editingCategory.description || '') : ''}" 
                    maxlength="300"
                  >
                </div>
              </div>

              <div style="margin-top: 18px; text-align: right; display: flex; justify-content: flex-end; gap: 10px;">
                ${editingCategory ? `
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-edit-cat-2">Cancel</button>
                ` : ''}
                <button type="submit" class="btn btn-primary btn-sm" id="btn-submit-cat">
                  ${editingCategory ? 'Update Category' : '+ Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    // 3. DISCOUNT COUPONS
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
                    <td><strong style="font-family: monospace; font-size: 1rem; color: var(--color-primary);">${escapeHtml(c.code)}</strong></td>
                    <td><strong>${c.discountPercent}% OFF</strong></td>
                    <td>Rs. ${(c.minOrderAmount || 0).toLocaleString()}</td>
                    <td>${c.usageCount || 0} times</td>
                    <td>
                      <span class="status-badge ${c.isActive ? 'delivered' : 'cancelled'}">
                        ${c.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button class="action-icon-btn danger btn-del-coupon" data-code="${escapeHtml(c.code)}" title="Delete coupon">
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
                  value="${escapeHtml(settings.heroSubtitle || 'Browse through our diverse range of meticulously crafted furnitures in Nepal.')}"
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
                <input type="number" id="low-stock-limit" class="settings-input" value="${escapeHtml(settings.lowStockThreshold ?? 3)}" min="1" max="50">
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
        quickWaInput.value = clean;
        if (formWaInput) formWaInput.value = clean;
        if (quickWaPreview) quickWaPreview.textContent = `https://wa.me/${clean}`;

        const updated = {
          ...settings,
          whatsappNumber: clean
        };
        try {
          await saveStoreSettings(updated);
          setSellerNumber(clean);
          if (getClient()) setCloudSellerNumber(clean);
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
        } catch (err) {
          console.error('Failed to update WhatsApp number:', err);
          events.emit('toast', { message: `Failed to update WhatsApp receiver: ${err.message}`, type: 'danger' });
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
        try {
          await saveStoreSettings(updated);
          setSellerNumber(cleanWa);
          if (getClient()) setCloudSellerNumber(cleanWa);
          settings = updated;
          events.emit('toast', { message: `Store profile & WhatsApp number (+${cleanWa}) saved!`, type: 'success' });
        } catch (err) {
          console.error('Failed to save store settings:', err);
          events.emit('toast', { message: `Failed to save store profile: ${err.message}`, type: 'danger' });
        }
      });
    }

    // 2. Category Management
    const categoryForm = container.querySelector('#form-category');
    if (categoryForm) {
      categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = container.querySelector('#cat-edit-id')?.value.trim();
        const name = container.querySelector('#cat-name')?.value.trim();
        const slug = container.querySelector('#cat-slug')?.value.trim().toLowerCase();
        const icon = container.querySelector('#cat-icon')?.value.trim();
        const description = container.querySelector('#cat-desc')?.value.trim();

        const payload = {
          id: editId || undefined,
          name,
          slug: slug || undefined,
          icon: icon || '🏷️',
          description
        };

        try {
          const saved = await saveCategory(payload);
          settings = await fetchStoreSettings();
          if (state) state.categories = settings.categories || [];
          events.emit('categories-updated', settings.categories || []);
          events.emit('toast', { 
            message: `Category "${saved.name}" successfully ${editId ? 'updated' : 'created'}!`, 
            type: 'success' 
          });
          editingCategory = null;
          render();
        } catch (err) {
          console.error('Failed to save category:', err);
          events.emit('toast', { message: `Validation Error: ${err.message}`, type: 'danger' });
        }
      });
    }

    // Edit category buttons
    container.querySelectorAll('.btn-edit-category').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.catId;
        const categoriesList = Array.isArray(settings.categories) ? settings.categories : [];
        const found = categoriesList.find(c => String(c.id) === String(id) || String(c.slug) === String(id));
        if (found) {
          editingCategory = found;
          render();
          container.querySelector('#form-category')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Cancel edit category buttons
    const cancelCatBtn = container.querySelector('#btn-cancel-edit-cat');
    const cancelCatBtn2 = container.querySelector('#btn-cancel-edit-cat-2');
    [cancelCatBtn, cancelCatBtn2].filter(Boolean).forEach(b => {
      b.addEventListener('click', () => {
        editingCategory = null;
        render();
      });
    });

    // Delete category buttons
    container.querySelectorAll('.btn-del-category').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.catId;
        const name = btn.dataset.catName;
        const count = Number(btn.dataset.catCount || 0);

        let msg = `Are you sure you want to delete category "${name}"?`;
        if (count > 0) {
          msg = `⚠️ Warning: ${count} product(s) are currently categorized under "${name}". Deleting this category will leave those products uncategorized in filters until reassigned. Are you sure you want to proceed?`;
        }

        if (confirm(msg)) {
          try {
            await deleteCategory(id);
            settings = await fetchStoreSettings();
            if (state) state.categories = settings.categories || [];
            events.emit('categories-updated', settings.categories || []);
            events.emit('toast', { message: `Category "${name}" deleted.`, type: 'info' });
            if (editingCategory && (editingCategory.id === id || editingCategory.slug === id)) {
              editingCategory = null;
            }
            render();
          } catch (err) {
            console.error('Failed to delete category:', err);
            events.emit('toast', { message: `Failed to delete category: ${err.message}`, type: 'danger' });
          }
        }
      });
    });

    // 3. Add Coupon Form
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
        try {
          await saveCoupon(newCp);
          coupons = await fetchCoupons();
          events.emit('toast', { message: `Coupon "${newCp.code}" created!`, type: 'success' });
          render();
        } catch (err) {
          console.error('Failed to create coupon:', err);
          events.emit('toast', { message: `Failed to create coupon: ${err.message}`, type: 'danger' });
        }
      });
    }

    // Delete coupon buttons
    container.querySelectorAll('.btn-del-coupon').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.dataset.code;
        if (confirm(`Delete coupon "${code}"?`)) {
          try {
            await deleteCoupon(code);
            coupons = await fetchCoupons();
            events.emit('toast', { message: `Coupon "${code}" removed`, type: 'info' });
            render();
          } catch (err) {
            console.error('Failed to delete coupon:', err);
            events.emit('toast', { message: `Failed to delete coupon: ${err.message}`, type: 'danger' });
          }
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
        try {
          await saveStoreSettings(updated);
          settings = updated;
          events.emit('toast', { message: 'Catalog display settings saved!', type: 'success' });
        } catch (err) {
          console.error('Failed to save catalog settings:', err);
          events.emit('toast', { message: `Failed to save catalog settings: ${err.message}`, type: 'danger' });
        }
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
        try {
          await saveStoreSettings(updated);
          settings = updated;
          events.emit('toast', { message: 'System & inventory thresholds saved!', type: 'success' });
        } catch (err) {
          console.error('Failed to save system settings:', err);
          events.emit('toast', { message: `Failed to save system settings: ${err.message}`, type: 'danger' });
        }
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
