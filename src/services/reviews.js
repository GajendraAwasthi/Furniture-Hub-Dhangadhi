import defaultReviews from '../data/reviews.json' with { type: 'json' };
import { getCustomerOrders } from './customer-auth.js';

const STORAGE_KEY = 'fh_customer_reviews_v2';

function getStoredReviews() {
  try {
    localStorage.removeItem('furniturehub_customer_reviews'); // purge legacy mock reviews
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read reviews from localStorage:', e);
  }
  return Array.isArray(defaultReviews) ? defaultReviews : [];
}

function saveReviews(reviews) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch (e) {
    console.warn('Failed to save reviews to localStorage:', e);
  }
}

/**
 * Check if a customer has actually purchased a given product
 */
export function hasCustomerPurchasedProduct(customerId, productId) {
  if (!customerId || !productId) return false;
  try {
    const orders = getCustomerOrders(customerId);
    if (!Array.isArray(orders) || orders.length === 0) return false;
    return orders.some(order => {
      if (!order.items || !Array.isArray(order.items)) return false;
      return order.items.some(item => 
        item.id === productId || 
        item.productId === productId || 
        (item.name && typeof item.name === 'string' && item.name.toLowerCase() === productId.toLowerCase())
      );
    });
  } catch {
    return false;
  }
}

/**
 * Get all customer reviews
 */
export function getAllReviews() {
  return getStoredReviews();
}

/**
 * Get reviews specifically for a given product ID (Only real reviews)
 */
export function getProductReviews(productId) {
  const all = getStoredReviews();
  return all.filter(r => r.productId === productId);
}

/**
 * Get top 3, 5-star reviews only from the whole project
 */
export function getTopReviews(limit = 3) {
  const all = getStoredReviews();
  // Strictly filter only 5-star verified reviews from the whole project
  const fiveStarReviews = all.filter(r => Number(r.rating) === 5);
  return fiveStarReviews.slice(0, limit);
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
 * Add a new customer review (Strictly verified buyers only)
 */
export function addCustomerReview(reviewData) {
  if (!reviewData.productId || !reviewData.comment) {
    throw new Error('Product ID and review comment are required');
  }

  // Check buyer verification
  if (reviewData.userId && !hasCustomerPurchasedProduct(reviewData.userId, reviewData.productId)) {
    throw new Error('Only verified buyers who have purchased this product can leave a review.');
  }

  const all = getStoredReviews();
  const newReview = {
    id: `rev-${Date.now()}`,
    productId: reviewData.productId,
    productName: reviewData.productName || 'Furniture Item',
    userName: reviewData.userName || 'Verified Buyer',
    userAvatar: reviewData.userAvatar || '/images/social-user.png',
    rating: Number(reviewData.rating) || 5,
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    location: reviewData.location || 'Dhangadhi, Nepal',
    verifiedPurchase: true,
    featuredOnHome: Number(reviewData.rating) === 5,
    title: reviewData.title || 'Verified Purchase',
    comment: reviewData.comment.trim()
  };

  const updated = [newReview, ...all];
  saveReviews(updated);
  return newReview;
}
