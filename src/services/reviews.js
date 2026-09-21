import defaultReviews from '../data/reviews.json' with { type: 'json' };

const STORAGE_KEY = 'furniturehub_customer_reviews';

function getStoredReviews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read reviews from localStorage:', e);
  }
  return defaultReviews;
}

function saveReviews(reviews) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch (e) {
    console.warn('Failed to save reviews to localStorage:', e);
  }
}

/**
 * Get all customer reviews (both default seed and user-submitted)
 */
export function getAllReviews() {
  return getStoredReviews();
}

/**
 * Get reviews specifically for a given product ID
 */
export function getProductReviews(productId) {
  const all = getStoredReviews();
  const matched = all.filter(r => r.productId === productId);
  if (matched.length > 0) {
    return matched;
  }
  // Fallback demo review if a product has no direct matches yet
  return [
    {
      id: `rev-gen-${productId}`,
      productId: productId,
      productName: 'Furniture Item',
      userName: 'Customer Reviewer',
      userAvatar: '/images/social-user.png',
      rating: 5,
      date: 'September 2026',
      location: 'Kathmandu, Nepal',
      verifiedPurchase: true,
      featuredOnHome: false,
      title: 'Exceptional craftsmanship and sleek finish',
      comment: 'Arrived exactly as described. High-end finish, sturdy construction, and fast delivery. Very pleased with this purchase!'
    }
  ];
}

/**
 * Get the Top 3 customer reviews featured for the main home page
 */
export function getTopReviews(limit = 3) {
  const all = getStoredReviews();
  // Filter featured ones first or sort by rating descending
  const featured = all.filter(r => r.featuredOnHome);
  if (featured.length >= limit) {
    return featured.slice(0, limit);
  }
  const remaining = all.filter(r => !r.featuredOnHome);
  return [...featured, ...remaining].slice(0, limit);
}

/**
 * Get statistical rating summary and star distribution for a product
 */
export function getProductRatingSummary(productId) {
  const reviews = getProductReviews(productId);
  const total = reviews.length;
  if (total === 0) {
    return {
      average: 5.0,
      total: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  reviews.forEach(r => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
    distribution[star] = (distribution[star] || 0) + 1;
    sum += (r.rating || 5);
  });

  const average = Number((sum / total).toFixed(1));
  return {
    average,
    total,
    distribution
  };
}

/**
 * Add a new customer review
 */
export function addCustomerReview(reviewData) {
  if (!reviewData.productId || !reviewData.comment) {
    throw new Error('Product ID and review comment are required');
  }

  const all = getStoredReviews();
  const newReview = {
    id: `rev-${Date.now()}`,
    productId: reviewData.productId,
    productName: reviewData.productName || 'Furniture Item',
    userName: reviewData.userName || 'Anonymous Customer',
    userAvatar: reviewData.userAvatar || '/images/social-user.png',
    rating: Number(reviewData.rating) || 5,
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    location: reviewData.location || 'Nepal',
    verifiedPurchase: true,
    featuredOnHome: false,
    title: reviewData.title || 'Verified Customer Review',
    comment: reviewData.comment.trim()
  };

  const updated = [newReview, ...all];
  saveReviews(updated);
  return newReview;
}
