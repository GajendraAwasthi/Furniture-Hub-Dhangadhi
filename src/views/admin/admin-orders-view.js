import { fetchOrders, updateOrderStatus, updateOrderTracking, deleteOrder, fetchStoreSettings } from '../../services/supabase.js';
import { escapeHtml } from '../../utils/security.js';
import { getBrandLoaderHtml } from '../../components/brand-loader.js';

export async function renderAdminOrdersView(container, state, events) {
  container.innerHTML = getBrandLoaderHtml({
    title: 'Customer Orders',
    text: 'Loading orders & sales transactions...',
    subtext: 'Furniture Hub Dhangadhi Order Sync',
    size: 'md',
    minHeight: '380px'
  });

  let orders = await fetchOrders();
  const settings = await fetchStoreSettings();
  const currency = settings.currency || 'Rs.';

  let activeFilter = 'All';
  let searchQuery = '';
  let viewingOrder = null;
  let trackingOrder = null;

  function getFilteredOrders() {
    return orders.filter(o => {
      const matchStatus = activeFilter === 'All' || (o.status || 'Pending').toLowerCase() === activeFilter.toLowerCase();
      const matchSearch = !searchQuery ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.customer_phone || '').includes(searchQuery) ||
        (o.delivery_address || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }

  function render() {
    const list = getFilteredOrders();
    const statuses = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

    container.innerHTML = `
      <div>
        <!-- Page Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div>
            <h1 style="font-size: 1.85rem; font-weight: 800; color: var(--color-primary); letter-spacing: -0.02em;">
              Customer Orders Database
            </h1>
            <p style="font-size: 0.9rem; color: var(--color-text-muted);">
              Manage dispatch, WhatsApp order fulfillment, and customer delivery details.
            </p>
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm" id="btn-refresh-orders">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span>Refresh Orders</span>
            </button>
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="admin-card" style="padding: 18px 24px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
            <div style="position: relative; max-width: 320px; width: 100%;">
              <input 
                type="text" 
                class="settings-input" 
                id="order-search-input" 
                placeholder="Search by Order ID, Name, or Phone..." 
                value="${escapeHtml(searchQuery)}"
                style="padding-left: 38px;"
              >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--color-text-subtle);">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${statuses.map(st => `
                <button class="filter-pill ${activeFilter === st ? 'active' : ''} order-status-filter" data-status="${st}">
                  ${st}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Orders Table -->
        <div class="admin-card">
          <div class="admin-card-header">
            <h2 class="admin-card-title">Order Records (${list.length})</h2>
            <div style="font-size: 0.82rem; color: var(--color-text-muted);">
              Updates are instantly saved to Supabase & local state
            </div>
          </div>

          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Customer & Location</th>
                  <th>Payment Method</th>
                  <th>Total</th>
                  <th>Status Workflow</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${list.length > 0 ? list.map(o => `
                  <tr>
                    <td>
                      <strong style="color: var(--color-primary); font-size: 0.95rem;">${o.id}</strong>
                    </td>
                    <td style="font-size: 0.82rem; color: var(--color-text-subtle); white-space: nowrap;">
                      ${new Date(o.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      <div style="font-weight: 700;">${o.customer_name}</div>
                      <div style="font-size: 0.8rem; color: var(--color-text-muted);">${o.customer_phone || ''}</div>
                      <div style="font-size: 0.78rem; color: var(--color-text-subtle);">${o.delivery_address || ''}</div>
                    </td>
                    <td>
                      <span class="badge-tag" style="background: rgba(37, 211, 102, 0.1); color: #075e54; border: 1px solid rgba(37, 211, 102, 0.3); display: inline-flex; align-items: center; gap: 4px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#25D366"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/></svg>
                        <span>${o.payment_method || 'WhatsApp Direct'}</span>
                      </span>
                    </td>
                    <td>
                      <strong style="font-size: 1rem; color: var(--color-primary);">${currency} ${Number(o.total_amount || 0).toLocaleString()}</strong>
                      <div style="font-size: 0.76rem; color: var(--color-text-subtle);">${(o.items || []).length} item(s)</div>
                    </td>
                    <td>
                      <select class="settings-select order-status-select" data-order-id="${o.id}" style="width: auto; padding: 6px 10px; font-size: 0.82rem; font-weight: 600;">
                        <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                        <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>⚙️ Processing</option>
                        <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>🚚 Shipped</option>
                        <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
                        <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                      </select>
                    </td>
                    <td style="text-align: right;">
                      <div style="display: inline-flex; gap: 8px;">
                        <button class="action-icon-btn btn-manage-tracking" data-id="${o.id}" title="Manage Tracking & Milestones" style="color: #122d25; background: rgba(18, 45, 37, 0.08);">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="1" y="3" width="15" height="13"></rect>
                            <polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon>
                            <circle cx="5.5" cy="18.5" r="2.5"></circle>
                            <circle cx="18.5" cy="18.5" r="2.5"></circle>
                          </svg>
                        </button>
                        <button class="action-icon-btn btn-view-receipt" data-id="${o.id}" title="View order receipt">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                        </button>
                        <button class="action-icon-btn danger btn-delete-order" data-id="${o.id}" title="Delete order record">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 48px 20px; color: var(--color-text-muted);">
                      No orders found matching the filter criteria.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Receipt Modal -->
        <div class="admin-modal-backdrop ${viewingOrder ? 'open' : ''}" id="receipt-modal">
          ${viewingOrder ? `
            <div class="admin-modal-card" style="max-width: 520px;">
              <div class="admin-modal-header">
                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary);">
                  Order Receipt #${viewingOrder.id}
                </h3>
                <button class="btn-icon" id="btn-close-receipt" style="font-size: 1.2rem;">✕</button>
              </div>

              <div class="admin-modal-body">
                <div style="background: var(--color-bg-light); border-radius: 12px; padding: 18px; margin-bottom: 20px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--color-text-subtle);">Customer:</span>
                    <strong>${viewingOrder.customer_name}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--color-text-subtle);">Phone:</span>
                    <span>${viewingOrder.customer_phone || 'N/A'}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--color-text-subtle);">Address:</span>
                    <span style="text-align: right; max-width: 250px;">${viewingOrder.delivery_address}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--color-text-subtle);">Order Channel:</span>
                    <strong style="color: #075e54; display: flex; align-items: center; gap: 4px;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#25D366"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/></svg>
                      ${viewingOrder.payment_method || 'WhatsApp Direct'}
                    </strong>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--color-text-subtle);">Status:</span>
                    <span class="status-badge ${(viewingOrder.status || 'Pending').toLowerCase()}">${viewingOrder.status}</span>
                  </div>
                </div>

                <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 12px; color: var(--color-primary);">
                  Ordered Furniture Items
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                  ${(viewingOrder.items || []).map(it => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-radius: 8px; border: 1px solid rgba(18,45,37,0.08);">
                      <div>
                        <div style="font-weight: 700; font-size: 0.9rem;">${it.name || it.product?.name || 'Furniture Item'}</div>
                        <div style="font-size: 0.78rem; color: var(--color-text-subtle);">${it.color ? `Color: ${it.color}` : ''} • Qty: ${it.quantity}</div>
                      </div>
                      <strong style="font-size: 0.92rem;">${currency} ${((it.price || it.product?.price || 0) * (it.quantity || 1)).toLocaleString()}</strong>
                    </div>
                  `).join('')}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 2px solid rgba(18,45,37,0.1); font-size: 1.15rem; font-weight: 800; color: var(--color-primary);">
                  <span>Grand Total:</span>
                  <span>${currency} ${Number(viewingOrder.total_amount || 0).toLocaleString()}</span>
                </div>
              </div>

              <div class="admin-modal-footer">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-done-receipt">Close</button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Tracking & Fulfillment Modal -->
        <div class="admin-modal-backdrop ${trackingOrder ? 'open' : ''}" id="tracking-modal">
          ${trackingOrder ? `
            <div class="admin-modal-card" style="max-width: 620px;">
              <div class="admin-modal-header">
                <div>
                  <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary); margin: 0;">
                    Manage Tracking: #${escapeHtml(trackingOrder.id)}
                  </h3>
                  <span style="font-size: 0.8rem; color: var(--color-text-subtle);">
                    Customer: ${escapeHtml(trackingOrder.customer_name)} (${escapeHtml(trackingOrder.customer_phone || 'N/A')})
                  </span>
                </div>
                <button class="btn-icon" id="btn-close-tracking" style="font-size: 1.2rem;">✕</button>
              </div>

              <div class="admin-modal-body" style="max-height: 70vh; overflow-y: auto;">
                <!-- Quick Tracking Link Box -->
                <div style="background: var(--color-bg-light); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                  <div>
                    <span style="font-size: 0.78rem; color: var(--color-text-subtle); display: block; font-weight: 700; text-transform: uppercase;">Customer Live Tracking URL</span>
                    <code style="font-size: 0.82rem; color: #122d25; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px;">#track?ref=${escapeHtml(trackingOrder.id)}</code>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn btn-sm btn-secondary" id="btn-copy-tracking-link">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      <span>Copy Link</span>
                    </button>
                    <a href="#track?ref=${encodeURIComponent(trackingOrder.id)}" target="_blank" class="btn btn-sm btn-outline" style="text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                      <span>Open Page</span>
                    </a>
                  </div>
                </div>

                <!-- Add Milestone Form -->
                <div style="border: 1px solid #e0e0e0; border-radius: 12px; padding: 18px; margin-bottom: 24px; background: #ffffff;">
                  <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--color-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span>Update Status & Add Tracking Milestone</span>
                  </h4>

                  <form id="form-add-milestone" style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                      <div>
                        <label style="font-size: 0.78rem; font-weight: 700; color: var(--color-text-subtle); display: block; margin-bottom: 4px;">Order Status</label>
                        <select id="milestone-status-select" class="settings-select" style="width: 100%;">
                          <option value="Processing" ${trackingOrder.status === 'Processing' ? 'selected' : ''}>📦 Processing (Packed)</option>
                          <option value="Shipped" ${trackingOrder.status === 'Shipped' ? 'selected' : ''}>🚚 Shipped (In Transit)</option>
                          <option value="Delivered" ${trackingOrder.status === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
                          <option value="Pending" ${trackingOrder.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                          <option value="Cancelled" ${trackingOrder.status === 'Cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label style="font-size: 0.78rem; font-weight: 700; color: var(--color-text-subtle); display: block; margin-bottom: 4px;">Milestone Title</label>
                        <input type="text" id="milestone-title-input" class="settings-input" placeholder="e.g. Quality Checked & Packed" value="Quality Checked & Packed in Showroom" required>
                      </div>
                    </div>

                    <div>
                      <label style="font-size: 0.78rem; font-weight: 700; color: var(--color-text-subtle); display: block; margin-bottom: 4px;">Location</label>
                      <input type="text" id="milestone-location-input" class="settings-input" placeholder="e.g. Dhangadhi Main Hub, Kailali" value="Dhangadhi Hub, Kailali">
                    </div>

                    <div>
                      <label style="font-size: 0.78rem; font-weight: 700; color: var(--color-text-subtle); display: block; margin-bottom: 4px;">Note / Dispatch Details</label>
                      <input type="text" id="milestone-note-input" class="settings-input" placeholder="e.g. Courier: Sundar Paschim Cargo, Driver: Ramesh (9848xxxxxx)">
                    </div>

                    <button type="submit" class="btn btn-primary btn-sm" style="align-self: flex-start; margin-top: 4px; display: inline-flex; align-items: center; gap: 6px;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      <span>Save & Publish Checkpoint</span>
                    </button>
                  </form>
                </div>

                <!-- Existing Milestones Timeline -->
                <div>
                  <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--color-primary); margin-bottom: 12px;">
                    Order Milestones Timeline (${(trackingOrder.tracking_history || []).length})
                  </h4>

                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${Array.isArray(trackingOrder.tracking_history) && trackingOrder.tracking_history.length > 0 ? (
                      trackingOrder.tracking_history.slice().reverse().map(m => `
                        <div style="background: #fafafa; border: 1px solid #eeeeee; border-radius: 8px; padding: 10px 14px;">
                          <div style="display: flex; justify-content: space-between; align-items: baseline;">
                            <strong style="color: var(--color-primary); font-size: 0.9rem;">${escapeHtml(m.title || m.status)}</strong>
                            <span style="font-size: 0.76rem; color: var(--color-text-subtle);">${new Date(m.timestamp).toLocaleString()}</span>
                          </div>
                          <div style="font-size: 0.8rem; color: var(--color-text-subtle); margin-top: 2px;">
                            Stage: <span class="status-badge ${(m.status || 'Pending').toLowerCase()}">${m.status}</span> &bull; 📍 ${escapeHtml(m.location || 'Dhangadhi')}
                          </div>
                          ${m.note ? `
                            <div style="font-size: 0.82rem; color: #333; margin-top: 6px; background: #fff; padding: 6px 10px; border-radius: 6px; border: 1px solid #e0e0e0;">
                              ${escapeHtml(m.note)}
                            </div>
                          ` : ''}
                        </div>
                      `).join('')
                    ) : `
                      <div style="color: var(--color-text-muted); font-size: 0.85rem; padding: 8px 0;">No milestones recorded yet.</div>
                    `}
                  </div>
                </div>

              </div>

              <div class="admin-modal-footer">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-done-tracking">Close</button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Search input
    const searchInput = container.querySelector('#order-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
      });
    }

    // Status filter pills
    container.querySelectorAll('.order-status-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.status;
        render();
      });
    });

    // Refresh orders
    const refreshBtn = container.querySelector('#btn-refresh-orders');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        orders = await fetchOrders();
        render();
        events.emit('toast', { message: 'Order database refreshed', type: 'info' });
      });
    }

    // Status change from select dropdown in table
    container.querySelectorAll('.order-status-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const orderId = e.target.dataset.orderId;
        const newStatus = e.target.value;
        await updateOrderStatus(orderId, newStatus);
        events.emit('toast', { message: `Order #${orderId} marked as ${newStatus}`, type: 'success' });
        orders = await fetchOrders();
        render();
      });
    });

    // Manage Tracking modal open
    container.querySelectorAll('.btn-manage-tracking').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const ord = orders.find(o => o.id === id);
        if (ord) {
          trackingOrder = ord;
          render();
        }
      });
    });

    // Preset milestone titles when status changes in modal
    const milestoneStatusSelect = container.querySelector('#milestone-status-select');
    const milestoneTitleInput = container.querySelector('#milestone-title-input');
    if (milestoneStatusSelect && milestoneTitleInput) {
      milestoneStatusSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'Processing') milestoneTitleInput.value = 'Quality Checked & Packed in Showroom';
        else if (val === 'Shipped') milestoneTitleInput.value = 'Dispatched with Courier / Delivery Van';
        else if (val === 'Delivered') milestoneTitleInput.value = 'Delivered to Doorstep';
        else if (val === 'Cancelled') milestoneTitleInput.value = 'Order Cancelled';
        else if (val === 'Pending') milestoneTitleInput.value = 'Order Received & Confirmed';
      });
    }

    // Add milestone form submit
    const milestoneForm = container.querySelector('#form-add-milestone');
    if (milestoneForm && trackingOrder) {
      milestoneForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const status = container.querySelector('#milestone-status-select')?.value || 'Processing';
        const title = container.querySelector('#milestone-title-input')?.value || 'Tracking Update';
        const location = container.querySelector('#milestone-location-input')?.value || 'Dhangadhi Hub, Kailali';
        const note = container.querySelector('#milestone-note-input')?.value || '';

        await updateOrderTracking(trackingOrder.id, { status, title, note, location });
        events.emit('toast', { message: `Checkpoint "${title}" saved!`, type: 'success' });

        orders = await fetchOrders();
        trackingOrder = orders.find(o => o.id === trackingOrder.id) || trackingOrder;
        render();
      });
    }

    // Copy tracking link in modal
    const copyTrackingBtn = container.querySelector('#btn-copy-tracking-link');
    if (copyTrackingBtn && trackingOrder) {
      copyTrackingBtn.addEventListener('click', () => {
        const url = `${window.location.origin}/#track?ref=${encodeURIComponent(trackingOrder.id)}`;
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(url).then(() => {
            events.emit('toast', { message: 'Customer tracking link copied to clipboard!', type: 'success' });
          }).catch(() => {
            prompt('Copy tracking link:', url);
          });
        } else {
          prompt('Copy tracking link:', url);
        }
      });
    }

    // Close tracking modal
    const closeTracking = container.querySelector('#btn-close-tracking');
    const doneTracking = container.querySelector('#btn-done-tracking');
    [closeTracking, doneTracking].forEach(el => {
      if (el) el.addEventListener('click', () => {
        trackingOrder = null;
        render();
      });
    });

    // View receipt
    container.querySelectorAll('.btn-view-receipt').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const ord = orders.find(o => o.id === id);
        if (ord) {
          viewingOrder = ord;
          render();
        }
      });
    });

    // Delete order
    container.querySelectorAll('.btn-delete-order').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm(`Delete order #${id} from the database?`)) {
          await deleteOrder(id);
          events.emit('toast', { message: `Order #${id} deleted`, type: 'info' });
          orders = await fetchOrders();
          render();
        }
      });
    });

    // Close receipt modal
    const closeRec = container.querySelector('#btn-close-receipt');
    const doneRec = container.querySelector('#btn-done-receipt');
    [closeRec, doneRec].forEach(el => {
      if (el) el.addEventListener('click', () => {
        viewingOrder = null;
        render();
      });
    });
  }

  render();
}
