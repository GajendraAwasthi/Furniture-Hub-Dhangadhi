import { getSellerNumber } from '../services/whatsapp.js';
import { isCurrentAdmin } from '../services/customer-auth.js';

export function renderFloatingWhatsApp(container, state, events) {
  // Hide WhatsApp completely for unauthenticated visitors
  if (!state.customerUser && !isCurrentAdmin()) {
    container.innerHTML = '';
    return;
  }

  const sellerNumber = getSellerNumber();
  const text = encodeURIComponent('Hello Furniture Hub Dhangadhi! I would like to order or ask an inquiry about your furniture collection.');
  const waUrl = `https://wa.me/${sellerNumber}?text=${text}`;

  container.innerHTML = `
    <div class="store-floating-wa-wrap">
      <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="store-floating-wa-btn" id="store-floating-wa-btn" title="Chat on WhatsApp (+${sellerNumber})" aria-label="Chat on WhatsApp">
        <div class="floating-wa-icon-box">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.42 0-2.82-.37-4.06-1.07l-.29-.17-3.02.79.81-2.94-.19-.3a8.14 8.14 0 0 1-1.25-4.5c0-4.54 3.7-8.24 8.24-8.24m4.53 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.14 0 1.26.92 2.48 1.05 2.65.13.17 1.81 2.76 4.38 3.87.61.27 1.09.43 1.46.55.62.2 1.18.17 1.62.11.5-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/>
          </svg>
        </div>
      </a>
    </div>
  `;
}
