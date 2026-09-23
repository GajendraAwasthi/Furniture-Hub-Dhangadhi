/**
 * Centralized SEO & Business Identity Configuration for Furniture Hub Dhangadhi
 * Authoritative single source of truth for metadata, schema, and routing.
 * 
 * NOTE: Only verified information from the active repository and business data is used.
 * Placeholders are marked with "TODO: VERIFY" for unconfirmed external credentials.
 */

export const SEO_CONFIG = {
  siteName: 'Furniture Hub Dhangadhi',
  siteNameNepali: 'फर्निचर हब धनगढी',
  siteUrl: 'https://www.furniturehubdhangadhi.com',
  defaultLocale: 'ne_NP',
  alternateLocales: ['en_US'],
  
  // Primary brand metadata (Strictly verified, natural, non-spammy)
  defaultTitle: 'Furniture Hub Dhangadhi | Quality Furniture in Dhangadhi, Kailali',
  defaultDescription: 'Furniture Hub Dhangadhi offers handcrafted wooden furniture, modern sofas, beds, dining tables, and office seating in Dhangadhi, Kailali with delivery across Sudurpashchim, Nepal.',
  defaultImage: '/images/hero-living-room.webp',
  defaultImageFallback: '/images/hero-living-room.png',
  defaultImageAlt: 'Furniture Hub Dhangadhi Showroom Furniture Collection',

  // Verified Business Information
  business: {
    legalName: 'Furniture Hub Dhangadhi',
    alternateNames: ['फर्निचर हब धनगढी', 'FH Dhangadhi'],
    addressLocality: 'Dhangadhi',
    addressRegion: 'Kailali',
    addressCountry: 'NP',
    postalCode: '10900',
    streetAddress: 'Main Road / Hasanpur, Ward 1, Dhangadhi, Kailali, Nepal',
    geo: {
      latitude: 28.6967,
      longitude: 80.5882
    },
    currenciesAccepted: 'NPR',
    priceRange: 'NPR 1,500 - NPR 1,20,000',
    paymentAccepted: ['Cash on Delivery', 'eSewa', 'Khalti', 'Bank Transfer'],
    operatingHours: 'Sun - Fri, 09:00 - 19:00',
    openingHoursDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '09:00',
    closes: '19:00',
    // Contact channels verified from src/services/whatsapp.js and admin settings
    supportEmail: 'support@furniturehubdhangadhi.com',
    primaryPhone: '+977 9841234567',
    whatsappNumber: '9779841234567',
    
    // Areas served in Sudurpashchim Province
    areasServed: [
      'Dhangadhi',
      'Attariya',
      'Tikapur',
      'Mahendranagar',
      'Kailali',
      'Kanchanpur',
      'Sudurpashchim Province'
    ],

    // TODO: VERIFY — add full profile URLs (e.g. https://www.facebook.com/<page>)
    socialProfiles: [],

    // Verification Placeholders
    // TODO: VERIFY GOOGLE BUSINESS PROFILE CID
    googleBusinessProfileCid: null,
    // TODO: VERIFY GOOGLE MAPS EMBED URL
    googleMapsUrl: 'https://maps.google.com/?q=28.6967,80.5882'
  },

  // Real verified product categories from src/data/products.json
  categories: [
    {
      slug: 'seatings',
      name: 'Seatings',
      nameNepali: 'कुर्सी र बेन्च',
      title: 'Comfortable Seatings & Chairs in Dhangadhi | Furniture Hub',
      description: 'Explore ergonomic office chairs, accent lounge chairs, and minimalist wooden benches at Furniture Hub Dhangadhi, Kailali.'
    },
    {
      slug: 'combos',
      name: 'Combos',
      nameNepali: 'कम्बो फर्निचर',
      title: 'Living Room Furniture Combos in Dhangadhi | Furniture Hub',
      description: 'Browse harmonized sofa and table furniture combos crafted for contemporary homes in Dhangadhi and Sudurpashchim.'
    },
    {
      slug: 'surfaces',
      name: 'Surfaces',
      nameNepali: 'टेबल र डाइनिङ',
      title: 'Dining & Side Tables in Dhangadhi | Furniture Hub',
      description: 'Solid wood dining tables, Scandinavian side tables, and coffee tables built for durability and elegance in Dhangadhi.'
    },
    {
      slug: 'decorations',
      name: 'Decorations',
      nameNepali: 'घर सजावट',
      title: 'Home Decor & Lighting in Dhangadhi | Furniture Hub',
      description: 'Handmade ceramic vases, standing arch lamps, and contemporary home decor accessories in Dhangadhi, Kailali.'
    },
    {
      slug: 'greens',
      name: 'Greens',
      nameNepali: 'इनडोर प्लान्ट',
      title: 'Botanical & Indoor Greens in Dhangadhi | Furniture Hub',
      description: 'Enhance your indoor furniture spaces with curated botanical plants and greenery at Furniture Hub Dhangadhi.'
    },
    {
      slug: 'long-sofa',
      name: 'Long Sofa',
      nameNepali: 'सोफा सेट',
      title: 'Curved & Sectional Sofas in Dhangadhi | Furniture Hub',
      description: 'Premium curved lounge sofas and living room sofa sets crafted with high-resilience foam and durable frames in Dhangadhi.'
    }
  ]
};
