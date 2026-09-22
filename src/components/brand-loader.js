/**
 * Furniture Hub Dhangadhi - Premium Brand Loader Component
 * Renders a luxury circular loader featuring the official store logo inside an animated rotating ring.
 */

export function getBrandLoaderHtml({
  title = 'Furniture Hub Dhangadhi',
  text = 'Loading...',
  subtext = '',
  size = 'md', // 'sm' | 'md' | 'lg'
  minHeight = '260px',
  fullScreen = false
} = {}) {
  const containerClass = fullScreen 
    ? 'fh-brand-loader-overlay' 
    : 'fh-brand-loader-container';

  return `
    <div class="${containerClass}" style="${!fullScreen ? `min-height: ${minHeight};` : ''}" role="status" aria-live="polite" aria-label="${text}">
      <div class="fh-loader-box fh-size-${size}">
        <!-- Pulsing Ambient Glow Aura -->
        <div class="fh-loader-glow-ring"></div>

        <!-- Animated SVG Gradient Rotating Spinner Rings -->
        <svg class="fh-loader-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Background Track -->
          <circle cx="50" cy="50" r="44" stroke="rgba(18, 45, 37, 0.08)" stroke-width="3" />
          
          <!-- Outer Emerald Primary Arc -->
          <circle 
            class="fh-spinner-arc-primary" 
            cx="50" cy="50" r="44" 
            stroke="#122d25" 
            stroke-width="3.5" 
            stroke-linecap="round"
            stroke-dasharray="140 140"
          />

          <!-- Inner Gold Accent Orbit Arc -->
          <circle 
            class="fh-spinner-arc-gold" 
            cx="50" cy="50" r="44" 
            stroke="#c5a880" 
            stroke-width="3.5" 
            stroke-linecap="round"
            stroke-dasharray="60 220"
          />
        </svg>

        <!-- Centered Logo Disc Badge -->
        <div class="fh-loader-logo-circle">
          <img 
            src="/images/furniture-hub-logo.png" 
            alt="Furniture Hub Logo" 
            class="fh-loader-logo-img"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <div class="fh-loader-fallback-icon" style="display: none;">
            🪑
          </div>
        </div>
      </div>

      <!-- Typography & Status -->
      ${title ? `<h4 class="fh-loader-title">${title}</h4>` : ''}
      ${text ? `<p class="fh-loader-text">${text}</p>` : ''}
      ${subtext ? `<span class="fh-loader-subtext">${subtext}</span>` : ''}

      <!-- Elegant Shimmer Progress Indicator -->
      <div class="fh-loader-shimmer-bar">
        <div class="fh-loader-shimmer-thumb"></div>
      </div>
    </div>
  `;
}

/**
 * Show a global full-screen brand loader overlay
 */
export function showGlobalBrandLoader(text = 'Loading Furniture Hub...') {
  let overlay = document.getElementById('fh-global-brand-loader');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'fh-global-brand-loader';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = getBrandLoaderHtml({
    text,
    fullScreen: true,
    size: 'lg'
  });
  overlay.style.display = 'flex';
  requestAnimationFrame(() => {
    overlay.classList.add('active');
  });
}

/**
 * Hide and dismiss the global brand loader overlay
 */
export function hideGlobalBrandLoader() {
  const overlay = document.getElementById('fh-global-brand-loader');
  if (!overlay) return;
  overlay.classList.remove('active');
  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.innerHTML = '';
  }, 350);
}
