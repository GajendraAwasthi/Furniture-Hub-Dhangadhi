import { fetchOrderByReference, fetchStoreSettings } from '../../services/supabase.js';
import { escapeHtml } from '../../utils/security.js';
import { resolveCloudImageUrl } from '../../utils/cloud-image-resolver.js';
import { getBrandLoaderHtml } from '../../components/brand-loader.js';

export async function renderTrackOrderView(container, state, events, params) {
  const queryRef = params?.get('ref') || params?.get('id') || params?.get('order') || '';
  const queryPhone = params?.get('phone') || '';

  let currentRef = queryRef.trim();
  let currentPhone = queryPhone.trim();
  let order = null;
  let hasSearched = Boolean(currentRef);
  let isLoading = false;
  let searchError = '';

  const settings = await fetchStoreSettings().catch(() => ({}));
  const storePhone = settings.phone || '+977 9841234567';
  const whatsappNumber = settings.whatsappNumber || '9779841234567';

  async function loadOrder(ref, phone) {
    if (!ref) {
      order = null;
      return;
    }
    isLoading = true;
    searchError = '';
    render();

    try {
      order = await fetchOrderByReference(ref, phone);
      if (!order) {
        searchError = `No order found with reference "${ref}". Please check your order number or contact support.`;
      }
    } catch (err) {
      console.error('Order tracking fetch error:', err);
      searchError = 'Unable to fetch tracking details. Please verify your connection or try again.';
      order = null;
    } finally {
      isLoading = false;
      render();
    }
  }

  function getStepProgress(status) {
    const s = (status || 'Pending').toLowerCase();
    if (s === 'delivered') return 4;
    if (s === 'shipped') return 3;
    if (s === 'processing') return 2;
    if (s === 'cancelled') return -1;
    return 1; // Pending
  }

  function formatDateTime(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  }

  function render() {
    const step = order ? getStepProgress(order.status) : 0;
    const isCancelled = order && (order.status || '').toLowerCase() === 'cancelled';

    container.innerHTML = `
      <div class="track-order-page" style="min-height: 80vh; padding: 40px 16px 80px; max-width: 920px; margin: 0 auto;">
        
        <!-- Breadcrumb & Header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(18, 45, 37, 0.06); padding: 6px 14px; border-radius: 999px; margin-bottom: 14px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#122d25" stroke-width="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span style="font-size: 0.82rem; font-weight: 700; color: #122d25; text-transform: uppercase; letter-spacing: 0.04em;">
              Live Doorstep Tracking
            </span>
          </div>

          <h1 style="font-family: var(--font-heading); font-size: clamp(1.85rem, 4vw, 2.5rem); font-weight: 800; color: var(--color-primary); margin-bottom: 8px;">
            Track Your Furniture Delivery
          </h1>
          <p style="color: var(--color-text-subtle); font-size: 1rem; max-width: 540px; margin: 0 auto;">
            Real-time status updates from Dhangadhi hub inspection, packaging, and dispatch straight to your home.
          </p>
        </div>

        <!-- Search Bar Card -->
        <div class="card" style="padding: 24px; border-radius: 16px; margin-bottom: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.06);">
          <form id="track-order-search-form" style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div style="flex: 2; min-width: 220px; position: relative;">
              <input 
                type="text" 
                id="track-input-ref" 
                class="settings-input" 
                placeholder="Enter Order Reference (e.g. FH-20260922-165551)" 
                value="${escapeHtml(currentRef)}"
                required
                style="height: 48px; font-size: 0.95rem; font-weight: 600; padding-left: 42px; border-radius: 10px;"
              >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--color-text-subtle);">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>

            <div style="flex: 1.5; min-width: 180px; position: relative;">
              <input 
                type="tel" 
                id="track-input-phone" 
                class="settings-input" 
                placeholder="Mobile Number (e.g. 98xxxxxxxx)" 
                value="${escapeHtml(currentPhone || '')}"
                style="height: 48px; font-size: 0.95rem; font-weight: 600; padding-left: 42px; border-radius: 10px;"
              >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--color-text-subtle);">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>

            <button type="submit" class="btn btn-primary" style="height: 48px; padding: 0 28px; border-radius: 10px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Track Order</span>
            </button>
          </form>

          ${searchError ? `
            <div style="margin-top: 16px; padding: 12px 16px; background: rgba(220, 20, 60, 0.08); border: 1px solid rgba(220, 20, 60, 0.25); border-radius: 8px; color: #b71c1c; font-size: 0.88rem; display: flex; align-items: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>${escapeHtml(searchError)}</span>
            </div>
          ` : ''}
        </div>

        ${isLoading ? `
          <div style="text-align: center; padding: 60px 0;">
            ${getBrandLoaderHtml({
              title: 'Locating Shipment',
              text: `Fetching tracking data for #${escapeHtml(currentRef)}...`,
              subtext: 'Connecting to Furniture Hub Fulfillment Database',
              size: 'md'
            })}
          </div>
        ` : order ? `
          <!-- Order Result Container -->
          <div class="track-order-result" style="display: flex; flex-direction: column; gap: 24px;">

            <!-- Status Banner -->
            <div class="card" style="padding: 24px; border-radius: 16px; background: #ffffff; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
                <div>
                  <div style="font-size: 0.82rem; color: var(--color-text-subtle); text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em;">
                    Order Reference
                  </div>
                  <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--color-primary); margin: 2px 0 6px;">
                    #${escapeHtml(order.id)}
                  </h2>
                  <div style="font-size: 0.88rem; color: var(--color-text-subtle);">
                    Placed on: <strong>${formatDateTime(order.created_at)}</strong>
                  </div>
                </div>

                <div>
                  ${isCancelled ? `
                    <span style="background: rgba(220, 20, 60, 0.12); color: #c62828; padding: 8px 16px; border-radius: 999px; font-weight: 800; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(220, 20, 60, 0.3);">
                      <span>❌ Order Cancelled</span>
                    </span>
                  ` : `
                    <span style="background: ${step >= 4 ? 'rgba(46, 125, 50, 0.12)' : step >= 3 ? 'rgba(25, 118, 210, 0.12)' : step >= 2 ? 'rgba(230, 81, 0, 0.12)' : 'rgba(245, 158, 11, 0.12)'}; color: ${step >= 4 ? '#2e7d32' : step >= 3 ? '#1565c0' : step >= 2 ? '#e65100' : '#b45309'}; padding: 8px 16px; border-radius: 999px; font-weight: 800; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px; border: 1px solid currentColor;">
                      <span>${step >= 4 ? '✅ Delivered' : step >= 3 ? '🚚 Dispatched / On The Way' : step >= 2 ? '📦 Packed & Ready' : '⏳ Order Received'}</span>
                    </span>
                  `}
                </div>
              </div>

              <!-- 4-Stage Visual Progress Stepper -->
              ${!isCancelled ? `
                <div class="stepper-wrap" style="margin: 32px 0 20px;">
                  <div style="position: relative; display: flex; justify-content: space-between; align-items: center;">
                    <!-- Track Line Background -->
                    <div style="position: absolute; left: 24px; right: 24px; top: 22px; height: 4px; background: #e0e0e0; z-index: 1;"></div>
                    <!-- Track Line Progress Fill -->
                    <div style="position: absolute; left: 24px; top: 22px; height: 4px; background: #122d25; z-index: 2; width: ${step === 1 ? '10%' : step === 2 ? '42%' : step === 3 ? '75%' : '100%'}; transition: width 0.4s ease;"></div>

                    <!-- Step 1: Placed -->
                    <div style="position: relative; z-index: 3; text-align: center; width: 80px;">
                      <div style="width: 44px; height: 44px; margin: 0 auto 8px; border-radius: 50%; background: ${step >= 1 ? '#122d25' : '#ffffff'}; color: ${step >= 1 ? '#ffffff' : '#757575'}; border: 2px solid #122d25; display: flex; align-items: center; justify-content: center; font-weight: 700; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      </div>
                      <span style="font-size: 0.78rem; font-weight: 700; color: ${step >= 1 ? '#122d25' : '#757575'}; display: block;">Confirmed</span>
                    </div>

                    <!-- Step 2: Packed -->
                    <div style="position: relative; z-index: 3; text-align: center; width: 80px;">
                      <div style="width: 44px; height: 44px; margin: 0 auto 8px; border-radius: 50%; background: ${step >= 2 ? '#122d25' : '#ffffff'}; color: ${step >= 2 ? '#ffffff' : '#757575'}; border: 2px solid ${step >= 2 ? '#122d25' : '#bdbdbd'}; display: flex; align-items: center; justify-content: center; font-weight: 700; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                      </div>
                      <span style="font-size: 0.78rem; font-weight: 700; color: ${step >= 2 ? '#122d25' : '#757575'}; display: block;">Packed</span>
                    </div>

                    <!-- Step 3: Shipped -->
                    <div style="position: relative; z-index: 3; text-align: center; width: 80px;">
                      <div style="width: 44px; height: 44px; margin: 0 auto 8px; border-radius: 50%; background: ${step >= 3 ? '#122d25' : '#ffffff'}; color: ${step >= 3 ? '#ffffff' : '#757575'}; border: 2px solid ${step >= 3 ? '#122d25' : '#bdbdbd'}; display: flex; align-items: center; justify-content: center; font-weight: 700; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                      </div>
                      <span style="font-size: 0.78rem; font-weight: 700; color: ${step >= 3 ? '#122d25' : '#757575'}; display: block;">Dispatched</span>
                    </div>

                    <!-- Step 4: Delivered -->
                    <div style="position: relative; z-index: 3; text-align: center; width: 80px;">
                      <div style="width: 44px; height: 44px; margin: 0 auto 8px; border-radius: 50%; background: ${step >= 4 ? '#2e7d32' : '#ffffff'}; color: ${step >= 4 ? '#ffffff' : '#757575'}; border: 2px solid ${step >= 4 ? '#2e7d32' : '#bdbdbd'}; display: flex; align-items: center; justify-content: center; font-weight: 700; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span style="font-size: 0.78rem; font-weight: 700; color: ${step >= 4 ? '#2e7d32' : '#757575'}; display: block;">Delivered</span>
                    </div>
                  </div>
                </div>
              ` : `
                <div style="background: rgba(220, 20, 60, 0.05); padding: 16px; border-radius: 12px; margin-top: 16px; color: #b71c1c; font-size: 0.92rem;">
                  This order has been cancelled. If you believe this is an error or would like to reactivate your order, please contact our support team.
                </div>
              `}
            </div>

            <!-- Two Columns: Timeline & Order Summary -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
              
              <!-- Left Column: Live Milestone Timeline -->
              <div class="card" style="padding: 24px; border-radius: 16px; background: #ffffff; border: 1px solid rgba(0,0,0,0.06);">
                <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--color-primary); margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <span>Tracking Milestones & Updates</span>
                </h3>

                <div class="tracking-timeline" style="display: flex; flex-direction: column; gap: 0;">
                  ${Array.isArray(order.tracking_history) && order.tracking_history.length > 0 ? (
                    order.tracking_history.slice().reverse().map((entry, idx, arr) => `
                      <div style="display: flex; gap: 16px; position: relative;">
                        <!-- Timeline Pin -->
                        <div style="display: flex; flex-direction: column; align-items: center;">
                          <div style="width: 14px; height: 14px; border-radius: 50%; background: ${idx === 0 ? '#122d25' : '#9e9e9e'}; border: 3px solid #ffffff; box-shadow: 0 0 0 2px ${idx === 0 ? '#122d25' : '#e0e0e0'}; margin-top: 4px;"></div>
                          ${idx !== arr.length - 1 ? `
                            <div style="width: 2px; flex: 1; background: #e0e0e0; min-height: 48px; margin: 4px 0;"></div>
                          ` : ''}
                        </div>

                        <!-- Milestone Content -->
                        <div style="padding-bottom: ${idx === arr.length - 1 ? '0' : '24px'}; flex: 1;">
                          <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 6px;">
                            <strong style="color: var(--color-primary); font-size: 0.95rem;">${escapeHtml(entry.title || entry.status)}</strong>
                            <span style="font-size: 0.78rem; color: var(--color-text-subtle);">${formatDateTime(entry.timestamp)}</span>
                          </div>
                          ${entry.location ? `
                            <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 2px;">
                              📍 ${escapeHtml(entry.location)}
                            </div>
                          ` : ''}
                          ${entry.note ? `
                            <div style="font-size: 0.85rem; color: #37474f; background: #f5f5f5; padding: 8px 12px; border-radius: 8px; margin-top: 6px; border-left: 3px solid #122d25;">
                              ${escapeHtml(entry.note)}
                            </div>
                          ` : ''}
                        </div>
                      </div>
                    `).join('')
                  ) : `
                    <div style="padding: 16px 0; color: var(--color-text-muted); font-size: 0.9rem;">
                      Order received. Inspection and packaging details will appear as your item progresses.
                    </div>
                  `}
                </div>

                <!-- Assistance Card -->
                <div style="margin-top: 24px; padding: 18px; border-radius: 12px; background: rgba(37, 211, 102, 0.08); border: 1px solid rgba(37, 211, 102, 0.25);">
                  <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                      <strong style="color: #075e54; font-size: 0.92rem; display: block;">Have questions about delivery?</strong>
                      <span style="color: #2e7d32; font-size: 0.82rem;">Direct helpline for Dhangadhi showroom fulfillment</span>
                    </div>
                    <a 
                      href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello Furniture Hub, I am inquiring about my Order #${order.id}. Could you please provide an update on its delivery status?`)}" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="btn btn-sm"
                      style="background: #25D366; color: white; border: none; font-weight: 700; border-radius: 8px; padding: 8px 16px; display: inline-flex; align-items: center; gap: 6px; text-decoration: none;"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/>
                      </svg>
                      <span>WhatsApp Help</span>
                    </a>
                  </div>
                </div>
              </div>

              <!-- Right Column: Delivery Details & Items -->
              <div style="display: flex; flex-direction: column; gap: 24px;">
                
                <!-- Delivery & Contact Info -->
                <div class="card" style="padding: 24px; border-radius: 16px; background: #ffffff; border: 1px solid rgba(0,0,0,0.06);">
                  <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--color-primary); margin-bottom: 16px;">
                    Destination & Recipient
                  </h3>
                  
                  <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.92rem;">
                    <div>
                      <span style="color: var(--color-text-subtle); display: block; font-size: 0.8rem;">Recipient:</span>
                      <strong>${escapeHtml(order.customer_name_masked || order.customer_name || 'Customer')}</strong>
                    </div>
                    ${order.customer_phone ? `
                      <div>
                        <span style="color: var(--color-text-subtle); display: block; font-size: 0.8rem;">Contact Number:</span>
                        <span>${escapeHtml(order.customer_phone)}</span>
                      </div>
                    ` : ''}
                    <div>
                      <span style="color: var(--color-text-subtle); display: block; font-size: 0.8rem;">Destination:</span>
                      <strong style="color: #122d25;">${escapeHtml(order.delivery_city || order.delivery_address || 'Dhangadhi, Nepal')}</strong>
                    </div>
                    ${order.payment_method ? `
                      <div>
                        <span style="color: var(--color-text-subtle); display: block; font-size: 0.8rem;">Payment Method:</span>
                        <span class="badge-tag" style="background: rgba(18, 45, 37, 0.08); color: #122d25; font-weight: 700; padding: 4px 10px; border-radius: 6px;">
                          ${escapeHtml(order.payment_method)}
                        </span>
                      </div>
                    ` : ''}
                  </div>
                </div>

                <!-- Ordered Items (Visible when item details are authorized) -->
                ${Array.isArray(order.items) && order.items.length > 0 ? `
                  <div class="card" style="padding: 24px; border-radius: 16px; background: #ffffff; border: 1px solid rgba(0,0,0,0.06);">
                    <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--color-primary); margin-bottom: 16px;">
                      Order Package Contents (${order.items.length})
                    </h3>

                    <div style="display: flex; flex-direction: column; gap: 14px; max-height: 280px; overflow-y: auto; padding-right: 6px;">
                      ${order.items.map(item => `
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0;">
                          <img 
                            src="${resolveCloudImageUrl(item.product?.image || item.image)}" 
                            alt="${escapeHtml(item.product?.name || item.name || 'Furniture')}"
                            style="width: 52px; height: 52px; border-radius: 8px; object-fit: cover; background: #f5f5f5;"
                            onerror="this.src='/images/hero-living-room.png'"
                          >
                          <div style="flex: 1;">
                            <h4 style="font-size: 0.92rem; font-weight: 700; color: var(--color-primary); margin: 0 0 2px;">
                              ${escapeHtml(item.product?.name || item.name || 'Furniture Item')}
                            </h4>
                            <span style="font-size: 0.78rem; color: var(--color-text-subtle);">
                              Qty: ${item.quantity || 1} ${item.color ? `&bull; ${escapeHtml(item.color)}` : ''}
                            </span>
                          </div>
                          <strong style="font-size: 0.95rem; color: var(--color-primary);">
                            Rs. ${Number((item.product?.price || item.price || 0) * (item.quantity || 1)).toLocaleString()}
                          </strong>
                        </div>
                      `).join('')}
                    </div>

                    ${(order.total_amount || order.total) ? `
                      <div style="margin-top: 18px; padding-top: 14px; border-top: 2px dashed #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 700; color: var(--color-text-subtle);">Total Investment</span>
                        <strong style="font-size: 1.35rem; color: var(--color-primary); font-weight: 800;">
                          Rs. ${Number(order.total_amount || order.total || 0).toLocaleString()}/-
                        </strong>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}

              </div>

            </div>

            <!-- Return / Back Actions -->
            <div style="display: flex; justify-content: center; gap: 16px; margin-top: 20px;">
              <a href="#shop" class="btn btn-outline" style="border-radius: 10px; padding: 12px 24px;">
                <span>Continue Shopping</span>
              </a>
              <button type="button" class="btn btn-secondary" id="btn-print-order" style="border-radius: 10px; padding: 12px 24px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                <span>Print Tracking Slip</span>
              </button>
            </div>

          </div>
        ` : hasSearched ? `
          <!-- No order found empty state -->
          <div class="card" style="text-align: center; padding: 60px 20px; border-radius: 16px;">
            <div style="width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 50%; background: #fff3e0; display: flex; align-items: center; justify-content: center; color: #e65100;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--color-primary); margin-bottom: 8px;">
              No Order Found for "${escapeHtml(currentRef)}"
            </h3>
            <p style="color: var(--color-text-subtle); max-width: 440px; margin: 0 auto 24px;">
              Please check your WhatsApp order receipt for your exact Reference ID (formatted like <code>FH-YYYYMMDD-XXXXXX</code>) or reach out to our team.
            </p>
            <a href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello Furniture Hub, I need help checking the status of my order.`)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
              <span>Contact Showroom Support</span>
            </a>
          </div>
        ` : `
          <!-- Initial landing guidance -->
          <div class="card" style="text-align: center; padding: 60px 20px; border-radius: 16px; border: 1px dashed #d0d0d0; background: #fafafa;">
            <div style="width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 50%; background: rgba(18, 45, 37, 0.08); display: flex; align-items: center; justify-content: center; color: #122d25;">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            </div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary); margin-bottom: 8px;">
              Have an Order Reference?
            </h3>
            <p style="color: var(--color-text-subtle); max-width: 480px; margin: 0 auto;">
              Enter your Order Reference from your WhatsApp confirmation link above to track dispatch status, packaging notes, and expected delivery time.
            </p>
          </div>
        `}

      </div>
    `;

    // Event Listeners
    const form = container.querySelector('#track-order-search-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const refInput = container.querySelector('#track-input-ref');
        const phoneInput = container.querySelector('#track-input-phone');
        if (refInput && refInput.value.trim()) {
          currentRef = refInput.value.trim();
          currentPhone = phoneInput ? phoneInput.value.trim() : '';
          hasSearched = true;
          // Update URL hash parameter cleanly without reload
          window.location.hash = `#track?ref=${encodeURIComponent(currentRef)}${currentPhone ? `&phone=${encodeURIComponent(currentPhone)}` : ''}`;
          loadOrder(currentRef, currentPhone);
        }
      });
    }

    const printBtn = container.querySelector('#btn-print-order');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }
  }

  // Initial load
  if (currentRef) {
    await loadOrder(currentRef, currentPhone);
  } else {
    render();
  }
}
