import { renderFigmaFooter } from '../components/footer.js';

export function renderAboutView(container, state, events) {
  container.innerHTML = `
    <!-- BREADCRUMBS -->
    <div class="container" style="padding-top: 24px;">
      <nav class="breadcrumbs">
        <a href="#home">Home</a>
        <span class="separator">/</span>
        <span>About Us</span>
      </nav>
    </div>

    <!-- ABOUT HERO -->
    <section class="about-hero" style="padding: 50px 20px 70px; text-align: center; background: radial-gradient(circle at center, rgba(18, 45, 37, 0.04) 0%, rgba(18, 45, 37, 0) 70%);">
      <div class="site-container" style="max-width: 820px; margin: 0 auto;">
        <span class="badge-tag" style="margin-bottom: 16px; background: rgba(18, 45, 37, 0.08); color: var(--color-primary); font-weight: 800;">
          Our Heritage & Philosophy
        </span>
        <h1 style="font-family: var(--font-heading); font-size: clamp(2.2rem, 4.5vw, 3.4rem); font-weight: 800; color: var(--color-primary); line-height: 1.2; margin-bottom: 16px;">
          Quality Furniture for Modern Homes
        </h1>
        <p style="font-size: 1.1rem; color: var(--color-text-subtle); line-height: 1.6; max-width: 620px; margin: 0 auto 32px;">
          Based in Dhangadhi, Kailali, Furniture Hub brings you modern, durable wooden furniture for your home and office — with reliable delivery across Nepal.
        </p>
        <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
          <a href="#shop" class="btn btn-primary" style="padding: 13px 30px; border-radius: 99px; font-weight: 700;">
            Explore the Collection
          </a>
          <a href="#faq" class="btn btn-outline" style="padding: 13px 30px; border-radius: 99px; font-weight: 700; border-color: var(--color-primary); color: var(--color-primary);">
            Help & Delivery FAQs
          </a>
        </div>
      </div>
    </section>

    <!-- KEY STATS SECTION -->
    <section style="background: var(--color-primary); color: #ffffff; padding: 50px 20px;">
      <div class="site-container">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 30px; text-align: center;">
          <div>
            <div style="font-family: var(--font-heading); font-size: 2.8rem; font-weight: 800; color: #ffcd29; margin-bottom: 4px;">1000+</div>
            <div style="font-size: 0.95rem; opacity: 0.9;">Homes & Spaces Furnished</div>
          </div>
          <div>
            <div style="font-family: var(--font-heading); font-size: 2.8rem; font-weight: 800; color: #ffcd29; margin-bottom: 4px;">4.9 ★</div>
            <div style="font-size: 0.95rem; opacity: 0.9;">Customer Satisfaction Score</div>
          </div>
          <div>
            <div style="font-family: var(--font-heading); font-size: 2.8rem; font-weight: 800; color: #ffcd29; margin-bottom: 4px;">5 Years</div>
            <div style="font-size: 0.95rem; opacity: 0.9;">Structural Timber Warranty</div>
          </div>
          <div>
            <div style="font-family: var(--font-heading); font-size: 2.8rem; font-weight: 800; color: #ffcd29; margin-bottom: 4px;">100%</div>
            <div style="font-size: 0.95rem; opacity: 0.9;">White-Glove Setup Across Sudurpashchim & Nepal</div>
          </div>
        </div>
      </div>
    </section>

    <!-- STORY & CRAFTSMANSHIP GRID -->
    <section class="site-container" style="padding: 80px 20px;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 48px; align-items: center; margin-bottom: 80px;">
        <div>
          <span style="font-size: 0.82rem; font-weight: 800; text-transform: uppercase; color: var(--color-primary); letter-spacing: 1px;">
            The Furniture Hub Dhangadhi Standard
          </span>
          <h2 style="font-family: var(--font-heading); font-size: 2.3rem; font-weight: 800; color: var(--color-primary); margin: 10px 0 20px; line-height: 1.25;">
            Built with Timber That Endures Generations
          </h2>
          <p style="font-size: 1rem; line-height: 1.7; color: var(--color-text); margin-bottom: 16px;">
            We believe that true luxury lies in simplicity and uncompromising material integrity. Rather than using flimsy particle board or disposable composites, our pieces are constructed using kiln-dried European ash, sustainably harvested birch, and solid timber.
          </p>
          <p style="font-size: 1rem; line-height: 1.7; color: var(--color-text); margin-bottom: 24px;">
            Every contour is shaped to withstand seasonal humidity and temperature changes in Dhangadhi, Kailali, and beyond, retaining its structural solidity year after year.
          </p>
          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.92rem; color: var(--color-primary);">
              <span style="color: #10b981;">✓</span> Moisture-Locked Kiln Drying
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.92rem; color: var(--color-primary);">
              <span style="color: #10b981;">✓</span> Natural Organic Matte Oils
            </div>
          </div>
        </div>

        <div style="border-radius: 20px; overflow: hidden; box-shadow: 0 20px 48px rgba(18, 45, 37, 0.12); border: 1px solid rgba(18, 45, 37, 0.1);">
          <img src="/images/hero-living-room.png" alt="Furniture Hub Dhangadhi Craftsmanship" style="width: 100%; height: auto; display: block;">
        </div>
      </div>

      <!-- FOUR PILLARS -->
      <div style="text-align: center; margin-bottom: 40px;">
        <h2 style="font-family: var(--font-heading); font-size: 2.1rem; font-weight: 800; color: var(--color-primary);">
          Why Discerning Homeowners Choose Us
        </h2>
        <p style="color: var(--color-text-subtle); max-width: 540px; margin: 8px auto 0;">
          From boardroom executive comfort to serene dining rooms, every piece embodies four non-negotiables:
        </p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px;">
        <div style="background: #ffffff; border-radius: 16px; padding: 30px; border: 1.5px solid rgba(18, 45, 37, 0.1); box-shadow: 0 4px 16px rgba(18, 45, 37, 0.04);">
          <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(18, 45, 37, 0.06); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; color: var(--color-primary);">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 9.2A7 7 0 0 1 11 20z"></path>
              <path d="m2 21 9-9"></path>
            </svg>
          </div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--color-primary); margin-bottom: 8px;">Responsible Wood</h3>
          <p style="font-size: 0.92rem; color: var(--color-text-subtle); line-height: 1.6;">
            100% certified kiln-dried hardwoods finished with plant-based, non-toxic satin sealants safe for families and children.
          </p>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 30px; border: 1.5px solid rgba(18, 45, 37, 0.1); box-shadow: 0 4px 16px rgba(18, 45, 37, 0.04);">
          <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(18, 45, 37, 0.06); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; color: var(--color-primary);">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"></path>
              <path d="M3 11v5a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"></path>
              <path d="M6 19v3"></path>
              <path d="M18 19v3"></path>
            </svg>
          </div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--color-primary); margin-bottom: 8px;">Ergonomic Precision</h3>
          <p style="font-size: 0.92rem; color: var(--color-text-subtle); line-height: 1.6;">
            High-resilience memory foam cushioning and pneumatic lumbar support engineered for effortless posture and all-day comfort.
          </p>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 30px; border: 1.5px solid rgba(18, 45, 37, 0.1); box-shadow: 0 4px 16px rgba(18, 45, 37, 0.04);">
          <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(18, 45, 37, 0.06); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; color: var(--color-primary);">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
          </div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--color-primary); margin-bottom: 8px;">White-Glove Setup</h3>
          <p style="font-size: 0.92rem; color: var(--color-text-subtle); line-height: 1.6;">
            Our dedicated delivery specialists assemble every piece in your desired room, test joints, and remove all packaging debris.
          </p>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 30px; border: 1.5px solid rgba(18, 45, 37, 0.1); box-shadow: 0 4px 16px rgba(18, 45, 37, 0.04);">
          <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(18, 45, 37, 0.06); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; color: var(--color-primary);">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
          </div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--color-primary); margin-bottom: 8px;">5-Year Warranty</h3>
          <p style="font-size: 0.92rem; color: var(--color-text-subtle); line-height: 1.6;">
            Every frame, joinery seam, and pneumatic mechanism is backed by our direct manufacturer structural replacement guarantee.
          </p>
        </div>
      </div>
    </section>

    <!-- FIGMA FOOTER -->
    ${renderFigmaFooter()}
  `;
}
