import { renderFigmaFooter } from '../components/footer.js';

export function renderFaqView(container, state, events) {
  const faqs = [
    {
      category: "Delivery & Assembly",
      items: [
        {
          q: "Where does Furniture Hub Dhangadhi deliver?",
          a: "We provide prompt delivery across Dhangadhi, Attariya, Mahendranagar, and throughout Sudurpashchim Province. We also coordinate scheduled deliveries across Nepal via trusted furniture logistics carriers."
        },
        {
          q: "Is assembly included with my furniture order?",
          a: "Yes! Deliveries within Dhangadhi include careful room placement and professional assembly by our trained technicians. They inspect all joints, level the piece, and remove protective packaging."
        },
        {
          q: "How do I track my active delivery?",
          a: "You can track your order status directly inside your dedicated Customer Dashboard at #customer/dashboard. Furthermore, our team sends dispatch and delivery updates directly to your registered WhatsApp mobile number."
        }
      ]
    },
    {
      category: "Ordering, Cart & WhatsApp",
      items: [
        {
          q: "Why do I need to sign in to add items to my cart?",
          a: "To ensure that every customer's shopping bag, delivery address, and order history remain strictly private, signing in with your customer account or Google Sign-In is required before items can be added to your cart."
        },
        {
          q: "How does ordering via WhatsApp work?",
          a: "When you proceed through the shopping bag drawer, a structured verified order receipt is generated with your exact item specifications. Clicking 'Complete via WhatsApp' connects you directly with our Dhangadhi order coordinator to confirm delivery time."
        },
        {
          q: "What payment methods are supported?",
          a: "We support Cash / QR on Delivery within Dhangadhi and Kailali, direct WhatsApp bank transfers (Fonepay QR, Nabil, NIC Asia), and digital wallets (eSewa / Khalti)."
        }
      ]
    },
    {
      category: "Materials & 5-Year Warranty",
      items: [
        {
          q: "What types of wood and materials do you use?",
          a: "We use moisture-calibrated kiln-dried European ash, solid Scandinavian birch, and certified timber. Upholstery features stain-resistant Nordic fabrics, premium PU leather, and ultra-durable high-resilience memory foam."
        },
        {
          q: "What is covered under the 5-Year Structural Warranty?",
          a: "Our 5-year warranty covers all structural timber frameworks, mortise-and-tenon joints, metal undercarriages, and executive pneumatic gas-lift cylinders. If any structural failure occurs under normal use, we repair or replace the piece under warranty."
        }
      ]
    },
    {
      category: "Returns & Custom Orders",
      items: [
        {
          q: "What is your return and exchange policy?",
          a: "We offer a 7-day peace-of-mind exchange policy. If an item arrives with any defect or doesn't fit your space as anticipated, contact our concierge team and we will coordinate an exchange or refund."
        },
        {
          q: "Can I customize the dimensions or upholstery color of a piece?",
          a: "Yes. Many of our solid wood dining surfaces, lounge sofas, and accent chairs can be tailored in our Dhangadhi workshop to your preferred dimensions or custom fabric colors. Contact our team directly on WhatsApp to discuss bespoke specifications."
        }
      ]
    }
  ];

  container.innerHTML = `
    <!-- BREADCRUMBS -->
    <div class="container" style="padding-top: 24px;">
      <nav class="breadcrumbs">
        <a href="#home">Home</a>
        <span class="separator">/</span>
        <span>Frequently Asked Questions</span>
      </nav>
    </div>

    <!-- FAQ HERO -->
    <section style="padding: 50px 20px 60px; text-align: center; background: radial-gradient(circle at center, rgba(18, 45, 37, 0.04) 0%, rgba(18, 45, 37, 0) 70%);">
      <div class="site-container" style="max-width: 800px; margin: 0 auto;">
        <span class="badge-tag" style="margin-bottom: 14px; background: rgba(18, 45, 37, 0.08); color: var(--color-primary); font-weight: 800;">
          Help Center & FAQs
        </span>
        <h1 style="font-family: var(--font-heading); font-size: clamp(2.3rem, 5vw, 3.6rem); font-weight: 800; color: var(--color-primary); line-height: 1.2; margin-bottom: 16px;">
          How Can We Help You?
        </h1>
        <p style="font-size: 1.1rem; color: var(--color-text-subtle); line-height: 1.6; max-width: 600px; margin: 0 auto 30px;">
          Everything you need to know about our handcrafted timber furniture, white-glove delivery across Nepal, warranty, and WhatsApp order flow.
        </p>

        <!-- Quick Filter Search -->
        <div style="max-width: 480px; margin: 0 auto;">
          <input 
            type="text" 
            id="faq-filter-input" 
            placeholder="Search FAQs (e.g. assembly, warranty, delivery, payment)..." 
            class="form-input" 
            style="padding: 13px 18px; border-radius: 12px; border: 1.5px solid rgba(18, 45, 37, 0.2); font-size: 0.95rem; width: 100%;"
          >
        </div>
      </div>
    </section>

    <!-- FAQ ACCORDION SECTION -->
    <section class="site-container" style="max-width: 840px; margin: 0 auto; padding: 40px 20px 80px;">
      <div id="faq-groups-container">
        ${faqs.map(grp => `
          <div class="faq-group-block" style="margin-bottom: 40px;">
            <h3 style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; color: var(--color-primary); border-bottom: 2px solid rgba(18, 45, 37, 0.1); padding-bottom: 10px; margin-bottom: 18px;">
              ${grp.category}
            </h3>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${grp.items.map((item, idx) => `
                <div class="faq-accordion-item" style="background: #ffffff; border: 1.5px solid rgba(18, 45, 37, 0.12); border-radius: 12px; overflow: hidden; transition: all 0.2s ease;">
                  <button type="button" class="faq-question-btn" style="width: 100%; text-align: left; padding: 18px 20px; background: none; border: none; font-size: 1.02rem; font-weight: 700; color: var(--color-primary); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                    <span>${item.q}</span>
                    <span class="faq-arrow" style="font-size: 1.2rem; transition: transform 0.25s ease; color: var(--color-text-subtle);">▾</span>
                  </button>
                  <div class="faq-answer-panel" style="padding: 0 20px 18px; font-size: 0.95rem; line-height: 1.65; color: var(--color-text); display: none;">
                    ${item.a}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- NEED MORE HELP BANNER -->
      <div style="margin-top: 50px; background: linear-gradient(135deg, #122d25 0%, #1c4538 100%); color: #ffffff; border-radius: 18px; padding: 36px; text-align: center;">
        <h3 style="font-family: var(--font-heading); font-size: 1.6rem; font-weight: 800; margin-bottom: 8px;">Still Have Questions?</h3>
        <p style="opacity: 0.9; max-width: 500px; margin: 0 auto 24px; font-size: 0.95rem;">
          Our Dhangadhi concierge specialists are online Sunday through Friday from 10:00 AM to 7:30 PM.
        </p>
        <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
          <a href="https://wa.me/9779841234567" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="background: #ffffff; color: var(--color-primary); font-weight: 800; border-radius: 99px; padding: 12px 28px;">
            Chat on WhatsApp
          </a>
          <a href="#shop" class="btn btn-outline" style="border-color: rgba(255, 255, 255, 0.4); color: #ffffff; font-weight: 700; border-radius: 99px; padding: 12px 28px;">
            Browse Furniture Collection
          </a>
        </div>
      </div>
    </section>

    <!-- FIGMA FOOTER -->
    ${renderFigmaFooter()}
  `;

  // Accordion toggle handler
  container.querySelectorAll('.faq-question-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.nextElementSibling;
      const arrow = btn.querySelector('.faq-arrow');
      const isOpen = panel.style.display === 'block';

      if (isOpen) {
        panel.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
      } else {
        panel.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
      }
    });
  });

  // Filter input handler
  const filterInput = container.querySelector('#faq-filter-input');
  if (filterInput) {
    filterInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      container.querySelectorAll('.faq-accordion-item').forEach(card => {
        const text = card.textContent.toLowerCase();
        if (!q || text.includes(q)) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
}
