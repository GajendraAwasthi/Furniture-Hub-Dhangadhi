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
        <h1 style="font-family: var(--font-heading); font-size: clamp(2.4rem, 5vw, 3.8rem); font-weight: 800; color: var(--color-primary); line-height: 1.18; margin-bottom: 20px;">
          Artisanal Craftsmanship Meets Nordic Minimalist Living
        </h1>
        <p style="font-size: 1.15rem; color: var(--color-text-subtle); line-height: 1.65; max-width: 680px; margin: 0 auto 36px;">
          Rooted in Dhangadhi, Kailali, Furniture Hub Dhangadhi bridges Nordic design purity with generational Nepali timber craftsmanship — creating timeless pieces that bring warmth, calm, and individuality to your home across Sudurpashchim Province and nationwide.
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
            <div style="font-family: var(--font-heading); font-size: 2.8rem; font-weight: 800; color: #ffcd29; margin-bottom: 4px;">10,000+</div>
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
          <div style="font-size: 2.2rem; margin-bottom: 14px;">🌲</div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--color-primary); margin-bottom: 8px;">Responsible Wood</h3>
          <p style="font-size: 0.92rem; color: var(--color-text-subtle); line-height: 1.6;">
            100% certified kiln-dried hardwoods finished with plant-based, non-toxic satin sealants safe for families and children.
          </p>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 30px; border: 1.5px solid rgba(18, 45, 37, 0.1); box-shadow: 0 4px 16px rgba(18, 45, 37, 0.04);">
          <div style="font-size: 2.2rem; margin-bottom: 14px;">🪑</div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--color-primary); margin-bottom: 8px;">Ergonomic Precision</h3>
          <p style="font-size: 0.92rem; color: var(--color-text-subtle); line-height: 1.6;">
            High-resilience memory foam cushioning and pneumatic lumbar support engineered for effortless posture and all-day comfort.
          </p>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 30px; border: 1.5px solid rgba(18, 45, 37, 0.1); box-shadow: 0 4px 16px rgba(18, 45, 37, 0.04);">
          <div style="font-size: 2.2rem; margin-bottom: 14px;">🛠️</div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--color-primary); margin-bottom: 8px;">White-Glove Setup</h3>
          <p style="font-size: 0.92rem; color: var(--color-text-subtle); line-height: 1.6;">
            Our dedicated delivery specialists assemble every piece in your desired room, test joints, and remove all packaging debris.
          </p>
        </div>

        <div style="background: #ffffff; border-radius: 16px; padding: 30px; border: 1.5px solid rgba(18, 45, 37, 0.1); box-shadow: 0 4px 16px rgba(18, 45, 37, 0.04);">
          <div style="font-size: 2.2rem; margin-bottom: 14px;">🛡️</div>
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
