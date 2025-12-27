/**
 * Dodo Payments Webhook Handler
 * Processes payment events and updates subscriptions securely using official SDK
 */

import { Webhooks } from '@dodopayments/nextjs';
import { createAdminClient } from '@/lib/supabase/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { createSafeWebhookHandler, extractUserIdSafely } from '@/lib/webhook-safety';
import { updateSubscriptionServerSide } from '@/lib/db/subscriptions.server';

const logger = createScopedLogger('api/payments/webhook');
const DODO_WEBHOOK_SECRET = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;

// Server-side function to log payment transactions
async function logPaymentTransaction(
  userId: string,
  paymentData: any,
  eventType: string
) {
  const supabase = await createAdminClient();

  try {
    await supabase.from('payment_transactions').insert({
      user_id: userId,
      dodo_payment_id: paymentData.payment_id || paymentData.id,
      dodo_subscription_id: paymentData.subscription_id,
      event_type: eventType,
      amount: paymentData.amount,
      currency: paymentData.currency || 'USD',
      status: eventType.includes('succeeded') ? 'succeeded' : 'failed',
      metadata: paymentData,
    });

    logger.info('Payment transaction logged', {
      userId,
      eventType,
      paymentId: paymentData.payment_id || paymentData.id,
    });
  } catch (error) {
    logger.error('Failed to log payment transaction', error, { userId });
  }
}

export const POST = Webhooks({
  webhookKey: DODO_WEBHOOK_SECRET!,

  // Log all webhooks for monitoring
  onPayload: async (payload) => {
    const data = payload.data as any;
    logger.info('Webhook received', {
      eventType: payload.type,
      payloadId: data?.id,
    });
  },

  // Subscription became active (new or reactivation)
  onSubscriptionActive: createSafeWebhookHandler('SubscriptionActive', async (payload) => {
    const data = payload.data as any;
    const { userId } = extractUserIdSafely(payload);

    if (!userId) {
      logger.warn('Subscription active event missing user_id');
      return;
    }

    logger.info('Subscription activated', { userId, subscriptionId: data.id });

    // Extract fields with fallbacks (CRITICAL: handle structure variations)
    const updateData = {
      plan: 'pro' as const,
      status: 'active' as const,
      dodo_customer_id: data.customer?.customer_id || data.customer_id,
      dodo_subscription_id: data.subscription_id || data.id,
      current_period_start: data.current_period_start,
      current_period_end: data.current_period_end,
      next_billing_at: data.next_billing_date || data.next_billing_at,
      last_payment_at: new Date().toISOString(),
      cancel_at_period_end: false,
    };

    await updateSubscriptionServerSide(userId, updateData);
  }),

  // Subscription renewed
  onSubscriptionRenewed: createSafeWebhookHandler('SubscriptionRenewed', async (payload) => {
    const data = payload.data as any;
    const { userId } = extractUserIdSafely(payload);

    if (!userId) {
      logger.warn('Subscription renewed event missing user_id');
      return;
    }

    logger.info('Subscription renewed', { userId, subscriptionId: data.id });

    await updateSubscriptionServerSide(userId, {
      current_period_start: data.current_period_start,
      current_period_end: data.current_period_end,
      next_billing_at: data.next_billing_date || data.next_billing_at,
      last_payment_at: new Date().toISOString(),
    });
  }),

  // Subscription cancelled
  onSubscriptionCancelled: createSafeWebhookHandler('SubscriptionCancelled', async (payload) => {
    const data = payload.data as any;
    const { userId } = extractUserIdSafely(payload);

    if (!userId) {
      logger.warn('Subscription cancelled event missing user_id');
      return;
    }

    logger.info('Subscription cancelled', { userId, subscriptionId: data.id });

    await updateSubscriptionServerSide(userId, {
      status: 'cancelled',
      cancel_at_period_end: true,
      cancelled_at: new Date().toISOString(),
    });
  }),

  // Subscription expired
  onSubscriptionExpired: createSafeWebhookHandler('SubscriptionExpired', async (payload) => {
    const data = payload.data as any;
    const { userId } = extractUserIdSafely(payload);

    if (!userId) {
      logger.warn('Subscription expired event missing user_id');
      return;
    }

    logger.info('Subscription expired', { userId, subscriptionId: data.id });

    await updateSubscriptionServerSide(userId, {
      plan: 'free',
      status: 'expired',
    });
  }),

  // Subscription failed (payment failure)
  onSubscriptionFailed: createSafeWebhookHandler('SubscriptionFailed', async (payload) => {
    const data = payload.data as any;
    const { userId } = extractUserIdSafely(payload);

    if (!userId) {
      logger.warn('Subscription failed event missing user_id');
      return;
    }

    logger.warn('Subscription payment failed', { userId, subscriptionId: data.id });

    // Don't downgrade immediately - user has retry period
  }),

  // Subscription on hold
  onSubscriptionOnHold: createSafeWebhookHandler('SubscriptionOnHold', async (payload) => {
    const data = payload.data as any;
    const { userId } = extractUserIdSafely(payload);

    if (!userId) {
      logger.warn('Subscription on hold event missing user_id');
      return;
    }

    logger.warn('Subscription on hold', { userId, subscriptionId: data.id });
  }),

  // Payment succeeded
  onPaymentSucceeded: createSafeWebhookHandler('PaymentSucceeded', async (payload) => {
    const data = payload.data as any;
    const { userId } = extractUserIdSafely(payload);

    if (!userId) {
      logger.warn('Payment succeeded event missing user_id');
      return;
    }

    logger.info('Payment succeeded', { userId, paymentId: data.id });

    // Log payment transaction (now using admin client - RLS bypassed)
    await logPaymentTransaction(userId, data, 'payment.succeeded');
  }),

  // Payment failed
  onPaymentFailed: createSafeWebhookHandler('PaymentFailed', async (payload) => {
    const data = payload.data as any;
    const { userId } = extractUserIdSafely(payload);

    if (!userId) {
      logger.warn('Payment failed event missing user_id');
      return;
    }

    logger.warn('Payment failed', { userId, paymentId: data.id });

    // Log failed payment transaction
    await logPaymentTransaction(userId, data, 'payment.failed');
  }),
});
