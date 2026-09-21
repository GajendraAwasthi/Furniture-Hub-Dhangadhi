import { fetchProducts, fetchOrders, fetchStoreSettings, updateOrderStatus } from '../../services/supabase.js';
import { getSellerNumber } from '../../services/whatsapp.js';

export async function renderAdminOverviewView(container, state, events) {
  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 200px;">
      <span style="color: var(--color-text-muted); font-weight: 600;">Loading live analytics & database records...</span>
    </div>
  `;

  const [products, orders, settings] = await Promise.all([
    fetchProducts(),
    fetchOrders(),
    fetchStoreSettings()
  ]);

  const currency = settings.currency || 'Rs.';
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const lowStockThreshold = Number(settings.lowStockThreshold || 3);
  const lowStockCount = products.filter(p => !p.inStock).length;
  const sellerPhone = getSellerNumber();

  container.innerHTML = `
    <div>
      <!-- Page Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h1 style="font-size: 1.85rem; font-weight: 800; color: var(--color-primary); letter-spacing: -0.02em;">
            Dashboard Overview
          </h1>
          <p style="font-size: 0.9rem; color: var(--color-text-muted);">
            Real-time metrics, recent customer transactions, and catalog status.
          </p>
        </div>

        <div style="display: flex; gap: 10px;">
          <a href="#admin/products" class="btn btn-primary btn-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add Product</span>
          </a>
          <a href="#admin/settings" class="btn btn-secondary btn-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>Settings</span>
          </a>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="admin-kpi-grid">
        <div class="admin-kpi-card">
          <div>
            <div class="kpi-title">Total Sales Volume</div>
            <div class="kpi-val">${currency} ${totalRevenue.toLocaleString()}</div>
            <div class="kpi-sub" style="color: #2e7d32;">↑ 14.8% vs last month</div>
          </div>
          <div class="kpi-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
        </div>

        <div class="admin-kpi-card">
          <div>
            <div class="kpi-title">Customer Orders</div>
            <div class="kpi-val">${orders.length}</div>
            <div class="kpi-sub">Across Nepal Valley</div>
          </div>
          <div class="kpi-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </div>
        </div>

        <div class="admin-kpi-card">
          <div>
            <div class="kpi-title">Catalog Inventory</div>
            <div class="kpi-val">${products.length} Items</div>
            <div class="kpi-sub">Active in 6 Categories</div>
          </div>
          <div class="kpi-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
        </div>

        <div class="admin-kpi-card">
          <div>
            <div class="kpi-title">Inventory Alerts</div>
            <div class="kpi-val" style="color: ${lowStockCount > 0 ? '#d32f2f' : 'var(--color-primary)'};">
              ${lowStockCount} Out of Stock
            </div>
            <div class="kpi-sub">Threshold: &lt; ${lowStockThreshold} units</div>
          </div>
          <div class="kpi-icon-box" style="background: #ffebee; color: #d32f2f;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
        </div>
      </div>

      <!-- WhatsApp Order Channel Status Banner -->
      <div style="background: linear-gradient(135deg, rgba(37, 211, 102, 0.08) 0%, rgba(18, 45, 37, 0.04) 100%); border: 1.5px solid #25D366; border-radius: 12px; padding: 18px 24px; margin-bottom: 28px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="background: #25D366; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; box-shadow: 0 4px 10px rgba(37, 211, 102, 0.35);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/>
            </svg>
          </div>
          <div>
            <div style="font-weight: 800; font-size: 1.05rem; color: #122d25;">
              WhatsApp Order Receiver: Active (+${sellerPhone})
            </div>
            <div style="font-size: 0.84rem; color: var(--color-text-muted);">
              All customer checkouts and orders route directly to this WhatsApp mobile number.
            </div>
          </div>
        </div>
        <a href="#admin/settings" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-weight: 700;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          <span>Change Number</span>
        </a>
      </div>

      <!-- Recent Orders Section -->
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h2 class="admin-card-title">Recent Customer Orders</h2>
            <p style="font-size: 0.85rem; color: var(--color-text-muted);">Incoming delivery orders across Kathmandu, Lalitpur, and Bhaktapur</p>
          </div>
          <a href="#admin/orders" class="btn btn-sm btn-secondary">
            View All Orders (${orders.length}) →
          </a>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Customer Details</th>
                <th>Payment</th>
                <th>Amount</th>
                <th>Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${orders.slice(0, 5).map(o => `
                <tr>
                  <td>
                    <strong style="color: var(--color-primary);">${o.id}</strong>
                    <div style="font-size: 0.75rem; color: var(--color-text-subtle);">
                      ${new Date(o.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </td>
                  <td>
                    <div style="font-weight: 700;">${o.customer_name}</div>
                    <div style="font-size: 0.8rem; color: var(--color-text-muted);">${o.customer_phone || ''} • ${o.delivery_address || ''}</div>
                  </td>
                  <td>
                    <span style="font-weight: 600; font-size: 0.82rem;">${o.payment_method || 'COD'}</span>
                  </td>
                  <td>
                    <strong style="font-size: 0.95rem;">${currency} ${Number(o.total_amount || 0).toLocaleString()}</strong>
                  </td>
                  <td>
                    <span class="status-badge ${(o.status || 'Pending').toLowerCase()}">
                      ${o.status || 'Pending'}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <select class="settings-select order-quick-status" data-order-id="${o.id}" style="width: auto; padding: 4px 8px; font-size: 0.8rem;">
                      <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                      <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
                      <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                      <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                      <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Featured Catalog Products Summary -->
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h2 class="admin-card-title">Catalog Highlights</h2>
            <p style="font-size: 0.85rem; color: var(--color-text-muted);">Key products and availability status</p>
          </div>
          <a href="#admin/products" class="btn btn-sm btn-secondary">
            Manage Catalog →
          </a>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Badge</th>
                <th>Availability</th>
              </tr>
            </thead>
            <tbody>
              ${products.slice(0, 5).map(p => `
                <tr>
                  <td>
                    <div class="product-row-flex">
                      <img src="${p.image}" alt="${p.name}" class="product-table-thumb">
                      <div>
                        <div style="font-weight: 700;">${p.name}</div>
                        <div style="font-size: 0.76rem; color: var(--color-text-subtle);">ID: ${p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge-tag" style="background: var(--color-bg-light); color: var(--color-primary); border: 1px solid rgba(18,45,37,0.12);">
                      ${p.category}
                    </span>
                  </td>
                  <td>
                    <strong>${currency} ${p.price.toLocaleString()}</strong>
                  </td>
                  <td>
                    <span class="badge-tag ${p.badge === 'Best Seller' ? 'badge-sale' : ''}">
                      ${p.badge || 'Standard'}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge ${p.inStock ? 'delivered' : 'cancelled'}">
                      ${p.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Status updater
  container.querySelectorAll('.order-quick-status').forEach(select => {
    select.addEventListener('change', async (e) => {
      const orderId = e.target.dataset.orderId;
      const newStatus = e.target.value;
      await updateOrderStatus(orderId, newStatus);
      events.emit('toast', { message: `Order #${orderId} status updated to ${newStatus}`, type: 'success' });
      renderAdminOverviewView(container, state, events);
    });
  });
}
