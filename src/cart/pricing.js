export function calculateCartTotals(cart, coupon = null) {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const eligibleCoupon = coupon?.isActive !== false &&
    (!coupon?.expiryDate || coupon.expiryDate >= new Date().toISOString().slice(0, 10)) &&
    subtotal >= (coupon?.minOrderAmount || 0) ? coupon : null;
  const discount = eligibleCoupon
    ? eligibleCoupon.discountPercent > 0
      ? Math.round(subtotal * eligibleCoupon.discountPercent / 100)
      : Math.min(subtotal, eligibleCoupon.discountFixed || 0)
    : 0;
  const shipping = subtotal > 0 ? (subtotal > 25000 ? 0 : 500) : 0;
  return { subtotal, discount, shipping, total: Math.max(0, subtotal - discount + shipping), eligibleCoupon };
}
