import { resolveCloudImageUrl } from '../utils/cloud-image-resolver.js';
import { getSellerNumber, formatCurrency } from '../services/whatsapp.js';

function getColorHex(name) {
  const map = {
    'Warm Ochre': '#c68a4c',
    'Sand Beige': '#e6d8c3',
    'Olive Slate': '#556b2f',
    'Slate Olive': '#556b2f',
    'Charcoal': '#333333',
    'Walnut': '#5c4033',
    'Natural Oak': '#d2b48c',
    'Forest Green': '#122d25',
    'Emerald': '#1b4d3e',
    'Terracotta': '#c85a32'
  };
  return map[name] || '#888888';
}

export function renderCartDrawer(container, state, events) {
  const sellerNumber = getSellerNumber();
  const totalItemsCount = state.cart.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = state.cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = state.couponApplied ? Math.round(subtotal * 0.1) : 0;
  const shipping = subtotal > 0 ? (subtotal > 25000 ? 0 : 500) : 0;
  const total = Math.max(0, subtotal - discount + shipping);

  // Prebuild instant 1-click cart chat URL
  const cartSummaryLines = state.cart.map((i, idx) => `${idx + 1}. ${i.product.name} x${i.quantity} — Rs. ${(i.product.price * i.quantity).toLocaleString()}/-`);
  const quickMsg = `Hello Furniture Hub Dhangadhi! I would like to order from my cart:\n${cartSummaryLines.join('\n')}\nTotal: Rs. ${total.toLocaleString()}/-\nPlease confirm delivery.`;
  const directCartWaUrl = `https://wa.me/${sellerNumber}?text=${encodeURIComponent(quickMsg)}`;

  function formatPrice(num) {
    return 'Rs. ' + num.toLocaleString() + '/-';
  }

  container.innerHTML = `
    <!-- Cart Backdrop -->
    <div class="drawer-backdrop ${state.isCartOpen ? 'open' : ''}" id="cart-drawer-backdrop"></div>

    <!-- Cart Drawer -->
    <div class="cart-drawer ${state.isCartOpen ? 'open' : ''}" id="cart-drawer-panel" role="dialog" aria-modal="true" aria-label="Shopping Cart">
      <!-- Header -->
      <div class="drawer-header">
        <h3 class="cart-header-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <span>Your Bag</span>
          <span class="cart-count-badge">${totalItemsCount} ${totalItemsCount === 1 ? 'item' : 'items'}</span>
        </h3>
        <button class="btn-icon" id="cart-close-btn" aria-label="Close cart drawer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>


      <!-- Items Body -->
      <div class="drawer-body">
        ${state.cart.length === 0 ? `
          <div class="cart-empty">
            <div class="cart-empty-icon-wrap">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </div>
            <h4>Your bag is empty</h4>
            <p>Explore our thoughtfully handcrafted furniture pieces and discover timeless elegance for your sanctuary.</p>
            <a href="#shop" class="btn btn-primary cart-empty-cta" id="empty-cart-explore-btn">
              <span>Explore Collection</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
          </div>
        ` : `
          ${state.cart.map(item => `
            <div class="cart-item" data-cart-item-id="${item.product.id}">
              <div class="cart-item-img">
                <img src="${resolveCloudImageUrl(item.product.image)}" alt="${item.product.name}" loading="lazy" onerror="this.src='/images/hero-living-room.png'">
              </div>
              <div class="cart-item-details">
                <div class="cart-item-top">
                  <div style="min-width: 0;">
                    <h4 class="cart-item-name" title="${item.product.name}">${item.product.name}</h4>
                    ${item.color ? `
                      <div class="cart-item-variant">
                        <span class="variant-dot" style="background-color: ${getColorHex(item.color)};"></span>
                        <span>${item.color}</span>
                      </div>
                    ` : ''}
                  </div>
                  <button class="cart-item-remove" data-remove-id="${item.product.id}" title="Remove item" aria-label="Remove ${item.product.name}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
                <div class="cart-item-bottom">
                  <div class="cart-stepper">
                    <button class="cart-stepper-btn cart-qty-minus" data-id="${item.product.id}" aria-label="Decrease quantity">−</button>
                    <span class="cart-stepper-value">${item.quantity}</span>
                    <button class="cart-stepper-btn cart-qty-plus" data-id="${item.product.id}" aria-label="Increase quantity">+</button>
                  </div>
                  <div class="cart-item-price-col">
                    ${item.quantity > 1 ? `<span class="cart-item-unit-price">${formatPrice(item.product.price)} each</span>` : ''}
                    <span class="cart-item-total-price">${formatPrice(item.product.price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        `}
      </div>

      <!-- Footer Summary & WhatsApp Checkout -->
      ${state.cart.length > 0 ? `
        <div class="drawer-footer">
          <!-- Coupon Box -->
          <div class="coupon-box">
            <div class="coupon-input-group">
              <svg class="coupon-tag-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
              </svg>
              <input type="text" class="coupon-input" id="cart-coupon-input" placeholder="Promo code (e.g. HUB10)" value="${state.couponCode || ''}">
              <button class="coupon-apply-btn" id="cart-coupon-apply-btn" type="button">Apply</button>
            </div>
            ${state.couponApplied ? `
              <div class="coupon-applied-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>10% Festive Discount Applied</span>
              </div>
            ` : ''}
          </div>

          <!-- Cost Breakdown Card -->
          <div class="cart-summary-breakdown">
            <div class="drawer-summary-row">
              <span>Subtotal (${totalItemsCount} items)</span>
              <span style="font-weight: 600; color: var(--color-primary);">${formatPrice(subtotal)}</span>
            </div>

            ${discount > 0 ? `
              <div class="drawer-summary-row discount">
                <span>Festive Promo (10%)</span>
                <span>- ${formatPrice(discount)}</span>
              </div>
            ` : ''}

            <div class="drawer-summary-row">
              <span>Delivery</span>
              <span style="font-weight: 600;">
                ${shipping > 0 ? formatPrice(shipping) : 'Standard Delivery'}
              </span>
            </div>

            <div class="drawer-summary-divider"></div>

            <div class="drawer-summary-row total">
              <div>
                <span class="summary-total-label">Total Amount</span>
                <span class="summary-tax-note">All taxes included</span>
              </div>
              <span class="summary-total-value">${formatPrice(total)}</span>
            </div>
          </div>

          <!-- Primary Checkout Action (Authenticated vs Guest) -->
          ${state.customerUser ? `
            <button class="cart-checkout-wa-btn" id="cart-checkout-btn">
              <div class="wa-btn-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/>
                </svg>
              </div>
              <span class="wa-btn-text">Proceed to WhatsApp Order</span>
              <svg class="wa-btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>

            <div class="cart-instant-link-wrap">
              <a href="${directCartWaUrl}" target="_blank" rel="noopener noreferrer" class="cart-instant-link">
                <span>⚡ Instant 1-Click WhatsApp Direct</span>
              </a>
            </div>
          ` : `
            <div class="cart-auth-lock-card">
              <div class="auth-lock-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>Sign In Required to Order</span>
              </div>
              <p class="auth-lock-desc">
                To protect store security and verify white-glove doorstep delivery across Nepal, please sign in or register before ordering via WhatsApp.
              </p>
              <button type="button" class="btn btn-primary cart-login-prompt-btn" id="cart-login-prompt-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Sign In / Register to Order</span>
              </button>
            </div>
          `}

          <div class="cart-security-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>100% Genuine Timber • Doorstep Inspection & Setup</span>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Checkout Modal -->
    <div class="modal-backdrop ${state.isCheckoutOpen ? 'open' : ''}" id="checkout-modal-backdrop">
      <div class="modal-card checkout-modal-card">
        <div class="checkout-modal-header">
          <div class="checkout-title-wrap">
            <div class="wa-badge-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#25D366"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/></svg>
            </div>
            <div>
              <h3>Fast WhatsApp Checkout</h3>
              <p class="checkout-subtitle">Confirm details to dispatch your order straight to store WhatsApp</p>
            </div>
          </div>
          <button class="btn-icon" id="checkout-modal-close-btn" aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form id="checkout-form">
          <div class="checkout-order-summary-card">
            <div class="summary-card-header">
              <span class="summary-card-title">Order Total (${totalItemsCount} items):</span>
              <strong class="summary-card-total">${formatPrice(total)}</strong>
            </div>
            <div class="summary-card-sub">Includes doorstep white-glove setup & packaging disposal across Nepal</div>
          </div>

          <!-- Customer Auth Status Banner -->
          ${state.customerUser ? `
            <div class="checkout-auth-banner signed-in">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="variant-dot" style="background: #25D366;"></span>
                <span>Signed in as <strong>${state.customerUser.name}</strong></span>
              </div>
              <span class="auth-prefill-badge">Pre-filled</span>
            </div>
          ` : `
            <div class="checkout-auth-banner guest">
              <span>Have a customer account?</span>
              <button type="button" id="checkout-signin-shortcut" class="auth-shortcut-btn">
                Sign In to Auto-Fill
              </button>
            </div>
          `}

          <div class="form-group">
            <label class="form-label">
              Full Name <span class="required-star">*</span>
            </label>
            <input type="text" class="form-input" id="checkout-name" required placeholder="e.g. Ram Bahadur Thapa" value="${state.customerUser?.name || state.customerProfile?.name || ''}">
          </div>

          <div class="form-group">
            <div class="form-label-row">
              <label class="form-label">
                WhatsApp Mobile Number <span class="required-star">*</span>
              </label>
              <span class="phone-hint-badge">🇳🇵 10-digit Nepal Mobile</span>
            </div>
            <input type="tel" class="form-input phone-highlight" id="checkout-phone" required placeholder="e.g. 9848123456" value="${state.customerUser?.phone || state.customerProfile?.phone || ''}">
            <span class="form-sub-hint">Your number is remembered for seamless future orders and direct WhatsApp delivery updates.</span>
          </div>

          <div class="form-group">
            <label class="form-label">
              Delivery Address <span class="required-star">*</span>
            </label>
            <input type="text" class="form-input" id="checkout-address" required placeholder="Street address, ward number, or landmark" value="${state.customerUser?.address || state.customerProfile?.address || ''}">
          </div>

          <div class="form-group">
            <label class="form-label">
              City / Delivery Region <span class="required-star">*</span>
            </label>
            <select class="form-input checkout-select" id="checkout-city">
              <option value="Dhangadhi" ${(state.customerUser?.city || state.customerProfile?.city || 'Dhangadhi') === 'Dhangadhi' ? 'selected' : ''}>Dhangadhi (Kailali)</option>
              <option value="Attariya" ${(state.customerUser?.city || state.customerProfile?.city) === 'Attariya' ? 'selected' : ''}>Attariya (Kailali)</option>
              <option value="Mahendranagar" ${(state.customerUser?.city || state.customerProfile?.city) === 'Mahendranagar' ? 'selected' : ''}>Mahendranagar (Kanchanpur)</option>
              <option value="Tikapur" ${(state.customerUser?.city || state.customerProfile?.city) === 'Tikapur' ? 'selected' : ''}>Tikapur (Kailali)</option>
              <option value="Dadeldhura" ${(state.customerUser?.city || state.customerProfile?.city) === 'Dadeldhura' ? 'selected' : ''}>Dadeldhura</option>
              <option value="Nepalgunj" ${(state.customerUser?.city || state.customerProfile?.city) === 'Nepalgunj' ? 'selected' : ''}>Nepalgunj</option>
              <option value="Kathmandu Valley" ${(state.customerUser?.city || state.customerProfile?.city) === 'Kathmandu Valley' ? 'selected' : ''}>Kathmandu Valley</option>
              <option value="Other Sudurpashchim Region" ${(state.customerUser?.city || state.customerProfile?.city) === 'Other Sudurpashchim Region' ? 'selected' : ''}>Other Sudurpashchim Region</option>
            </select>
          </div>

          <button type="submit" class="checkout-submit-wa-btn" id="checkout-submit-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/>
            </svg>
            <span>Send Order via WhatsApp (${formatPrice(total)})</span>
          </button>
          
          <div style="text-align: center; margin-top: 12px; font-size: 0.8rem; color: var(--color-text-subtle);">
            Order is verified and forwarded to our official store WhatsApp for immediate delivery scheduling.
          </div>
        </form>
      </div>
    </div>

    <!-- Order Confirmation Receipt Modal -->
    <div class="modal-backdrop ${state.isReceiptOpen ? 'open' : ''}" id="receipt-modal-backdrop">
      <div class="modal-card receipt-modal-card">
        <div class="order-success-card">
          <div class="order-success-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h3 class="receipt-title">
            Order Confirmed!
          </h3>
          <p class="receipt-subtitle">
            Thank you for choosing Furniture Hub Dhangadhi. Your order message has been prepared for store WhatsApp delivery confirmation.
          </p>

          ${state.lastOrder ? `
            <div class="order-receipt-box">
              <div class="receipt-row">
                <span class="receipt-label">Order Reference:</span>
                <strong class="receipt-val receipt-ref">#${state.lastOrder.id}</strong>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Date:</span>
                <span class="receipt-val">${state.lastOrder.date}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Customer:</span>
                <span class="receipt-val">${state.lastOrder.name} (${state.lastOrder.phone})</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Delivery To:</span>
                <span class="receipt-val">${state.lastOrder.address || 'Kathmandu Valley'}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Order Channel:</span>
                <span class="receipt-val channel-wa">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/></svg>
                  WhatsApp Direct
                </span>
              </div>
              <div class="receipt-divider"></div>
              <div class="receipt-row total-row">
                <span>Amount Due / Paid:</span>
                <strong class="receipt-total">Rs. ${state.lastOrder.total.toLocaleString()}/-</strong>
              </div>
            </div>

            <div class="receipt-delivery-banner" style="display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
              <span><strong>Delivery Timeline:</strong> 1-3 Business Days within Dhangadhi & Sudurpashchim. Professional delivery and packaging handling included.</span>
            </div>
          ` : ''}

          <!-- WhatsApp Connect Button -->
          ${state.lastOrder && state.lastOrder.whatsappUrl ? `
            <a href="${state.lastOrder.whatsappUrl}" target="_blank" rel="noopener noreferrer" class="receipt-wa-btn" id="receipt-whatsapp-btn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/>
              </svg>
              <span>Connect on WhatsApp for Delivery Scheduling</span>
            </a>
          ` : ''}

          ${state.lastOrder ? `
            <a href="#track?ref=${encodeURIComponent(state.lastOrder.id)}" class="btn btn-outline" id="receipt-track-btn" style="width: 100%; margin-bottom: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; padding: 12px 16px; border-radius: 10px; font-weight: 700; border: 2px solid #122d25; color: #122d25; background: #ffffff;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
              <span>Track Live Delivery Status</span>
            </a>
          ` : ''}

          <button class="btn btn-primary receipt-continue-btn" id="receipt-continue-btn">
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  const backdrop = container.querySelector('#cart-drawer-backdrop');
  const closeBtn = container.querySelector('#cart-close-btn');

  function closeCart() {
    events.emit('close-cart');
  }

  if (backdrop) backdrop.addEventListener('click', closeCart);
  if (closeBtn) closeBtn.addEventListener('click', closeCart);

  const exploreBtn = container.querySelector('#empty-cart-explore-btn');
  if (exploreBtn) {
    exploreBtn.addEventListener('click', () => {
      closeCart();
    });
  }

  // Remove items
  container.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.removeId;
      events.emit('remove-from-cart', pid);
    });
  });

  // Steppers
  container.querySelectorAll('.cart-qty-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.id;
      events.emit('update-cart-qty', { id: pid, delta: -1 });
    });
  });

  container.querySelectorAll('.cart-qty-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.id;
      events.emit('update-cart-qty', { id: pid, delta: 1 });
    });
  });

  // Coupon code — validated dynamically against the live coupons store
  const couponBtn = container.querySelector('#cart-coupon-apply-btn');
  const couponInput = container.querySelector('#cart-coupon-input');
  if (couponBtn && couponInput) {
    couponBtn.addEventListener('click', () => {
      const code = couponInput.value.trim().toUpperCase();
      if (!code) {
        events.emit('toast', { message: 'Please enter a coupon code.', type: 'danger' });
        return;
      }
      events.emit('apply-coupon', code);
    });
  }

  // Login prompt button for guests
  const loginPromptBtn = container.querySelector('#cart-login-prompt-btn');
  if (loginPromptBtn) {
    loginPromptBtn.addEventListener('click', () => {
      events.emit('close-cart');
      events.emit('open-customer-auth');
    });
  }

  // Open checkout (guarded for authenticated customers)
  const checkoutBtn = container.querySelector('#cart-checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (!state.customerUser) {
        events.emit('close-cart');
        events.emit('toast', { message: '🔒 Please sign in to place your order via WhatsApp.', type: 'danger' });
        events.emit('open-customer-auth');
        return;
      }
      events.emit('close-cart');
      events.emit('open-checkout');
    });
  }

  // Modal close
  const checkoutCloseBtn = container.querySelector('#checkout-modal-close-btn');
  const checkoutBackdrop = container.querySelector('#checkout-modal-backdrop');
  if (checkoutCloseBtn) {
    checkoutCloseBtn.addEventListener('click', () => {
      events.emit('close-checkout');
    });
  }
  if (checkoutBackdrop) {
    checkoutBackdrop.addEventListener('click', (e) => {
      if (e.target === checkoutBackdrop) {
        events.emit('close-checkout');
      }
    });
  }

  const signinShortcut = container.querySelector('#checkout-signin-shortcut');
  if (signinShortcut) {
    signinShortcut.addEventListener('click', () => {
      events.emit('close-checkout');
      events.emit('open-customer-auth');
    });
  }

  // Checkout form submit
  const checkoutForm = container.querySelector('#checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!state.customerUser) {
        events.emit('close-checkout');
        events.emit('toast', { message: '🔒 Please sign in or register before submitting your order.', type: 'danger' });
        events.emit('open-customer-auth');
        return;
      }
      const nameInput = checkoutForm.querySelector('#checkout-name');
      const phoneInput = checkoutForm.querySelector('#checkout-phone');
      const addressInput = checkoutForm.querySelector('#checkout-address');
      const citySelect = checkoutForm.querySelector('select');

      const customerName = nameInput ? nameInput.value.trim() : (state.customerUser?.name || 'Customer');
      const customerPhone = phoneInput ? phoneInput.value.trim().replace(/[^0-9]/g, '') : (state.customerUser?.phone || '');
      const customerAddress = addressInput ? addressInput.value.trim() : (state.customerUser?.address || '');
      const customerCity = citySelect ? citySelect.value : (state.customerUser?.city || 'Dhangadhi');
      const fullAddress = customerAddress ? `${customerAddress}, ${customerCity}` : customerCity;

      // Automatically remember user's mobile number and address for future orders
      events.emit('update-user-profile', {
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
        city: customerCity
      });

      events.emit('order-placed', {
        total,
        name: customerName,
        phone: customerPhone,
        address: fullAddress,
        paymentMethod: 'WhatsApp Direct',
        couponCode: state.couponApplied ? (state.couponCode || null) : null
      });
    });
  }

  // Receipt modal handlers
  const receiptBtn = container.querySelector('#receipt-continue-btn');
  const receiptBackdrop = container.querySelector('#receipt-modal-backdrop');
  if (receiptBtn) {
    receiptBtn.addEventListener('click', () => {
      events.emit('close-receipt');
      window.location.hash = '#shop';
    });
  }
  if (receiptBackdrop) {
    receiptBackdrop.addEventListener('click', (e) => {
      if (e.target === receiptBackdrop) {
        events.emit('close-receipt');
      }
    });
  }
}
