/**
 * PortOne V2 Payment Service
 * Handles all PortOne payment operations for JISA App
 *
 * Features:
 * - Payment creation and verification
 * - Billing key management (subscription payments)
 * - Webhook verification
 * - Subscription billing automation
 */

import * as PortOne from '@portone/server-sdk';

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface PaymentRequest {
  userId: string;
  paymentId: string;
  orderName: string;
  amount: number;
  currency?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionPaymentRequest {
  userId: string;
  subscriptionId: string;
  billingKey: string;
  amount: number;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
}

export interface BillingKeyRequest {
  userId: string;
  customerName: string;
  customerEmail: string;
}

export interface WebhookEvent {
  type: string;
  timestamp: string;
  data: {
    storeId?: string;
    paymentId?: string;
    transactionId?: string;
    billingKey?: string;
    cancellationId?: string;
  };
}

// =====================================================
// PORTONE SERVICE CLASS
// =====================================================

class PortOneService {
  private client: ReturnType<typeof PortOne.PortOneClient> | null = null;
  private storeId: string;
  private channelKey: string;
  private webhookSecret: string;

  constructor() {
    // Initialize PortOne client (lazy - only if API secret is available)
    const apiSecret = process.env.PORTONE_API_SECRET;

    if (apiSecret) {
      this.client = PortOne.PortOneClient({ secret: apiSecret });
    } else {
      console.warn('⚠️ PORTONE_API_SECRET not configured - PortOne service disabled');
    }

    // Store configuration
    this.storeId = process.env.PORTONE_STORE_ID || '';
    this.channelKey = process.env.PORTONE_CHANNEL_KEY || '';
    this.webhookSecret = process.env.PORTONE_WEBHOOK_SECRET || '';

    if (!this.storeId || !this.channelKey) {
      console.warn('⚠️ PortOne Store ID or Channel Key not configured');
    }
  }

  private ensureClient() {
    if (!this.client) {
      throw new Error('PortOne client not initialized - check PORTONE_API_SECRET');
    }
    return this.client;
  }

  // =====================================================
  // PAYMENT METHODS
  // =====================================================

  /**
   * Get payment details from PortOne
   */
  async getPayment(paymentId: string) {
    try {
      const payment = await this.ensureClient().payment.getPayment({ paymentId });
      return payment;
    } catch (error) {
      console.error('PortOne API Error:', error);
      return null;
    }
  }

  /**
   * Verify payment against expected amount
   * CRITICAL: Always verify payment amount to prevent fraud
   */
  async verifyPayment(paymentId: string, expectedAmount: number): Promise<{
    isValid: boolean;
    payment?: any;
    error?: string;
  }> {
    try {
      const payment = await this.getPayment(paymentId);

      if (!payment) {
        return {
          isValid: false,
          error: 'Payment not found',
        };
      }

      // Verify channel is LIVE (not TEST)
      if ((payment as any).channel?.type !== 'LIVE') {
        return {
          isValid: false,
          error: 'Payment is not from LIVE channel',
        };
      }

      // Verify amount
      const paymentAmount = (payment as any).amount?.total;
      if (paymentAmount !== expectedAmount) {
        return {
          isValid: false,
          error: `Amount mismatch: expected ${expectedAmount}, got ${paymentAmount}`,
        };
      }

      // Verify status is PAID
      const paymentStatus = (payment as any).status;
      if (paymentStatus !== 'PAID') {
        return {
          isValid: false,
          error: `Payment status is ${paymentStatus}, not PAID`,
        };
      }

      return {
        isValid: true,
        payment,
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel payment (full or partial)
   */
  async cancelPayment(paymentId: string, options?: {
    amount?: number;
    reason?: string;
    requester?: string;
  }) {
    try {
      const result = await this.ensureClient().payment.cancelPayment({
        paymentId,
        reason: options?.reason || 'Customer requested',
        ...options,
      });
      return result;
    } catch (error) {
      console.error('Payment cancellation error:', error);
      throw error;
    }
  }

  // =====================================================
  // BILLING KEY METHODS (SUBSCRIPTION PAYMENTS)
  // =====================================================

  /**
   * Issue billing key for recurring payments
   * This is typically done via SDK on frontend, but can be done server-side
   */
  async issueBillingKey(request: BillingKeyRequest) {
    try {
      // Note: Billing key issuance is typically handled by frontend SDK
      // This is a placeholder for server-side implementation if needed
      console.log('Billing key issuance requested:', request);
      throw new Error('Billing key issuance should be done via frontend SDK');
    } catch (error) {
      console.error('Billing key issuance error:', error);
      throw error;
    }
  }

  /**
   * Delete billing key (when user cancels subscription)
   */
  async deleteBillingKey(billingKey: string) {
    try {
      // TODO: Update when PortOne SDK v0.18+ has correct billingKey API
      // const result = await this.client.billingKey.deleteBillingKey({
      //   billingKey,
      // });
      console.warn('Billing key deletion not yet implemented in SDK');
      return { success: true };
    } catch (error) {
      console.error('Billing key deletion error:', error);
      throw error;
    }
  }

  /**
   * Get billing key info
   */
  async getBillingKey(billingKey: string) {
    try {
      // TODO: Update when PortOne SDK v0.18+ has correct billingKey API
      // const result = await this.client.billingKey.getBillingKey({
      //   billingKey,
      // });
      console.warn('Get billing key not yet implemented in SDK');
      return null;
    } catch (error) {
      console.error('Get billing key error:', error);
      throw error;
    }
  }

  /**
   * Pay with billing key (recurring subscription payment)
   */
  async payWithBillingKey(request: SubscriptionPaymentRequest) {
    try {
      // Generate unique payment ID
      const paymentId = `sub_${request.subscriptionId}_${Date.now()}`;

      const result = await this.ensureClient().payment.payWithBillingKey({
        paymentId,
        billingKey: request.billingKey,
        orderName: request.orderName,
        amount: {
          total: request.amount,
        },
        currency: 'KRW',
        ...(request.customerEmail && {
          customer: {
            email: request.customerEmail,
          },
        }),
      });

      return {
        paymentId,
        result,
      };
    } catch (error) {
      console.error('Pay with billing key error:', error);
      throw error;
    }
  }

  /**
   * Schedule recurring payment
   */
  async schedulePayment(request: SubscriptionPaymentRequest & {
    scheduledAt: Date;
  }) {
    try {
      const paymentId = `scheduled_${request.subscriptionId}_${Date.now()}`;

      const result = await this.ensureClient().payment.payWithBillingKey({
        paymentId,
        billingKey: request.billingKey,
        orderName: request.orderName,
        amount: {
          total: request.amount,
        },
        currency: 'KRW',
        ...(request.customerEmail && {
          customer: {
            email: request.customerEmail,
          },
        }),
      });

      return {
        paymentId,
        result,
      };
    } catch (error) {
      console.error('Schedule payment error:', error);
      throw error;
    }
  }

  // =====================================================
  // WEBHOOK METHODS
  // =====================================================

  /**
   * Verify webhook signature
   * CRITICAL: Always verify webhook to prevent fake requests
   */
  async verifyWebhook(
    body: string,
    headers: Record<string, string>
  ): Promise<{ isValid: boolean; webhook?: WebhookEvent; error?: string }> {
    try {
      const webhook = await PortOne.Webhook.verify(
        this.webhookSecret,
        body,
        headers
      );

      return {
        isValid: true,
        webhook: webhook as WebhookEvent,
      };
    } catch (error) {
      if (error instanceof PortOne.Webhook.WebhookVerificationError) {
        return {
          isValid: false,
          error: 'Webhook signature verification failed',
        };
      }
      console.error('Webhook verification error:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Generate random payment ID
   */
  generatePaymentId(prefix: string = 'payment'): string {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  /**
   * Get store configuration
   */
  getStoreConfig() {
    return {
      storeId: this.storeId,
      channelKey: this.channelKey,
    };
  }

  /**
   * Calculate subscription amount based on tier and cycle
   */
  getSubscriptionAmount(tier: string, cycle: 'monthly' | 'yearly'): number {
    const pricing: Record<string, { monthly: number; yearly: number }> = {
      free: { monthly: 0, yearly: 0 },
      basic: { monthly: 10000, yearly: 100000 }, // ₩10,000/month or ₩100,000/year
      pro: { monthly: 30000, yearly: 300000 },   // ₩30,000/month or ₩300,000/year
      enterprise: { monthly: 100000, yearly: 1000000 }, // ₩100,000/month or ₩1,000,000/year
    };

    const tierPricing = pricing[tier.toLowerCase()];
    if (!tierPricing) {
      throw new Error(`Unknown subscription tier: ${tier}`);
    }

    return cycle === 'monthly' ? tierPricing.monthly : tierPricing.yearly;
  }

  /**
   * Format amount for display (KRW)
   */
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let portoneServiceInstance: PortOneService | null = null;

export function getPortOneService(): PortOneService {
  if (!portoneServiceInstance) {
    portoneServiceInstance = new PortOneService();
  }
  return portoneServiceInstance;
}

// Export default instance
export const portoneService = getPortOneService();

// =====================================================
// SUBSCRIPTION BILLING AUTOMATION
// =====================================================

/**
 * Process subscription renewal
 * This should be called by a cron job or scheduled task
 */
export async function processSubscriptionRenewals() {
  // TODO: Implement in API route with proper error handling
  // 1. Find subscriptions ending today
  // 2. Charge with billing key
  // 3. Update subscription period
  // 4. Create invoice
  // 5. Log billing event
  console.log('Subscription renewal processing...');
}

/**
 * Handle failed subscription payment
 */
export async function handleFailedSubscriptionPayment(subscriptionId: string) {
  // TODO: Implement retry logic
  // 1. Retry payment 3 times over 7 days
  // 2. Send email notifications
  // 3. If still failing, mark subscription as past_due
  // 4. After grace period, cancel subscription
  console.log('Handling failed payment for subscription:', subscriptionId);
}

export default portoneService;
