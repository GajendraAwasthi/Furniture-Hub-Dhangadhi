/**
 * PaymentStrategy Interface
 * Isolates order completion from payment processing so additional gateways
 * (e.g. eSewa, Khalti, Card) can be plugged in without modifying core order transactions.
 */
export class PaymentStrategy {
  /**
   * Process or initialize payment.
   * @param {Object} paymentContext - { orderRef, amountMinor, currency, customer }
   * @returns {Promise<{ success: boolean, paymentMethod: string, paymentStatus: string, transactionId?: string }>}
   */
  async processPayment(paymentContext) {
    throw new Error('PaymentStrategy.processPayment must be implemented by concrete provider');
  }
}

/**
 * Cash on Delivery Strategy
 * Orders are placed in 'PLACED' status with 'PENDING' payment collected upon doorstep white-glove delivery.
 */
export class CashOnDeliveryStrategy extends PaymentStrategy {
  constructor() {
    super();
    this.name = 'Cash on Delivery';
  }

  async processPayment({ orderRef, amountMinor, customer }) {
    if (!orderRef || !amountMinor || amountMinor <= 0n) {
      throw new Error('Invalid payment parameters for Cash on Delivery.');
    }

    return {
      success: true,
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'PENDING',
      transactionId: `COD-${orderRef}`,
      details: {
        instructions: 'Amount payable in cash or mobile banking QR upon delivery setup in Nepal.',
        settlementOnDelivery: true
      }
    };
  }
}

/**
 * WhatsApp Direct Strategy
 * Order confirmed and routed directly via WhatsApp with the seller.
 */
export class WhatsAppDirectStrategy extends PaymentStrategy {
  constructor() {
    super();
    this.name = 'WhatsApp Direct';
  }

  async processPayment({ orderRef, amountMinor, customer }) {
    if (!orderRef || !amountMinor || amountMinor <= 0n) {
      throw new Error('Invalid payment parameters for WhatsApp Direct.');
    }

    return {
      success: true,
      paymentMethod: 'WhatsApp Direct',
      paymentStatus: 'PENDING',
      transactionId: `WA-${orderRef}`,
      details: {
        instructions: 'Order routed directly via WhatsApp for delivery and payment coordination.',
        settlementOnDelivery: true
      }
    };
  }
}

// Registry for pluggable payment strategies
const strategies = {
  cod: new CashOnDeliveryStrategy(),
  'cash on delivery': new CashOnDeliveryStrategy(),
  whatsapp: new WhatsAppDirectStrategy(),
  'whatsapp direct': new WhatsAppDirectStrategy()
};

export function getPaymentStrategy(method) {
  if (method === undefined || method === null || method === '') {
    return strategies['whatsapp'];
  }
  const clean = String(method).trim().toLowerCase();
  const strategy = strategies[clean];
  if (!strategy) {
    throw new Error(`Unsupported payment method: "${method}". Available methods: ${Object.keys(strategies).join(', ')}`);
  }
  return strategy;
}

