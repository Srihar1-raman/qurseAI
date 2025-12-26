/**
 * Dodo Payments Webhook Handler
 * Processes payment events and updates subscriptions securely
 */

import { NextRequest, NextResponse } from 'next/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { updateSubscription, getUserSubscription } from '@/lib/services/subscription';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const logger = createScopedLogger('api/payments/webhook');

const DODO_WEBHOOK_KEY = process.env.DODO_PAYMENTS_WEBHOOK_KEY;

/**
 * Verify webhook signature using HMAC-SHA256
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookKey: string
): boolean {
  try {
    // Dodo sends signature as hex string
    const hmac = crypto.createHmac('sha256', webhookKey);
    hmac.update(payload);
    const digest = hmac.digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const digestBuffer = Buffer.from(digest, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');

    if (digestBuffer.length !== signatureBuffer.length) {
      return false;
    }

    // Timing-safe comparison
    return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
  } catch (error) {
    logger.error('Signature verification error', error);
    return false;
  }
}

/**
 * Webhook event handlers
 */
const webhookHandlers: Record<string, (payload: any) => Promise<void>> = {
  'subscription.active': handleSubscriptionActive,
  'subscription.on_hold': handleSubscriptionOnHold,
  'subscription.renewed': handleSubscriptionRenewed,
  'subscription.cancelled': handleSubscriptionCancelled,
  'subscription.failed': handleSubscriptionFailed,
  'subscription.expired': handleSubscriptionExpired,
  'payment.succeeded': handlePaymentSucceeded,
  'payment.failed': handlePaymentFailed,
};

async function handleSubscriptionActive(payload: any) {
  const { data } = payload;
  const userId = data.metadata?.user_id;
  const dodoSubscriptionId = data.id;

  if (!userId) {
    logger.warn('Subscription active event missing user_id', { payload });
    return;
  }

  // Idempotency check: skip if already processed
  const existingSubscription = await getUserSubscription(userId);
  if (existingSubscription?.dodo_subscription_id === dodoSubscriptionId && existingSubscription?.plan === 'pro') {
    logger.info('Duplicate subscription.active event skipped', { userId, dodoSubscriptionId });
    return;
  }

  logger.info('Subscription activated', { userId, subscriptionId: dodoSubscriptionId });

  await updateSubscription(userId, {
    plan: 'pro',
    status: 'active',
    dodo_customer_id: data.customer_id,
    dodo_subscription_id: dodoSubscriptionId,
    current_period_start: data.current_period_start,
    current_period_end: data.current_period_end,
    next_billing_at: data.next_billing_at,
    last_payment_at: new Date().toISOString(),
    cancel_at_period_end: false,
  });
}

async function handleSubscriptionRenewed(payload: any) {
  const { data } = payload;
  const userId = data.metadata?.user_id;

  if (!userId) {
    logger.warn('Subscription renewed event missing user_id', { payload });
    return;
  }

  logger.info('Subscription renewed', { userId, subscriptionId: data.id });

  await updateSubscription(userId, {
    current_period_start: data.current_period_start,
    current_period_end: data.current_period_end,
    next_billing_at: data.next_billing_at,
    last_payment_at: new Date().toISOString(),
  });
}

async function handleSubscriptionCancelled(payload: any) {
  const { data } = payload;
  const userId = data.metadata?.user_id;

  if (!userId) {
    logger.warn('Subscription cancelled event missing user_id', { payload });
    return;
  }

  logger.info('Subscription cancelled', { userId, subscriptionId: data.id });

  await updateSubscription(userId, {
    status: 'cancelled',
    cancel_at_period_end: true,
    cancelled_at: new Date().toISOString(),
  });
}

async function handleSubscriptionFailed(payload: any) {
  const { data } = payload;
  const userId = data.metadata?.user_id;

  if (!userId) {
    logger.warn('Subscription failed event missing user_id', { payload });
    return;
  }

  logger.warn('Subscription payment failed', { userId, subscriptionId: data.id });

  // Don't downgrade immediately - user has retry period
  // Keep subscription active for now
}

async function handleSubscriptionExpired(payload: any) {
  const { data } = payload;
  const userId = data.metadata?.user_id;

  if (!userId) {
    logger.warn('Subscription expired event missing user_id', { payload });
    return;
  }

  logger.info('Subscription expired', { userId, subscriptionId: data.id });

  await updateSubscription(userId, {
    plan: 'free',
    status: 'expired',
  });
}

async function handleSubscriptionOnHold(payload: any) {
  const { data } = payload;
  const userId = data.metadata?.user_id;

  if (!userId) {
    logger.warn('Subscription on hold event missing user_id', { payload });
    return;
  }

  logger.warn('Subscription on hold', { userId, subscriptionId: data.id });

  // Keep subscription active but log for monitoring
  // May want to notify user
}

async function handlePaymentSucceeded(payload: any) {
  const { data } = payload;
  const userId = data.metadata?.user_id;

  if (!userId) {
    logger.warn('Payment succeeded event missing user_id', { payload });
    return;
  }

  logger.info('Payment succeeded', { userId, paymentId: data.id });

  // Log payment transaction to payment_transactions table
  try {
    const supabase = await createClient();

    await supabase.from('payment_transactions').insert({
      user_id: userId,
      dodo_payment_id: data.id,
      dodo_subscription_id: data.subscription_id,
      event_type: 'payment.succeeded',
      amount: data.amount,
      currency: data.currency || 'USD',
      status: 'succeeded',
      metadata: payload,
    });
  } catch (error) {
    logger.error('Failed to log payment transaction', error, { userId });
  }

  // Subscription is already updated by subscription.active event
}

async function handlePaymentFailed(payload: any) {
  const { data } = payload;
  const userId = data.metadata?.user_id;

  if (!userId) {
    logger.warn('Payment failed event missing user_id', { payload });
    return;
  }

  logger.warn('Payment failed', { userId, paymentId: data.id });

  // Log failed payment transaction
  try {
    const supabase = await createClient();

    await supabase.from('payment_transactions').insert({
      user_id: userId,
      dodo_payment_id: data.id,
      dodo_subscription_id: data.subscription_id,
      event_type: 'payment.failed',
      amount: data.amount,
      currency: data.currency || 'USD',
      status: 'failed',
      metadata: payload,
    });
  } catch (error) {
    logger.error('Failed to log payment transaction', error, { userId });
  }
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();

  try {
    // ============================================
    // Stage 1: Verify webhook signature
    // ============================================
    const signature = request.headers.get('x-dodo-signature') || request.headers.get('dodo-signature');

    if (!signature) {
      logger.error('Webhook missing signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    if (!DODO_WEBHOOK_KEY) {
      logger.error('DODO_PAYMENTS_WEBHOOK_KEY not configured');
      return NextResponse.json(
        { error: 'Webhook configuration error' },
        { status: 500 }
      );
    }

    const rawPayload = await request.text();

    const isValid = verifyWebhookSignature(rawPayload, signature, DODO_WEBHOOK_KEY);

    if (!isValid) {
      logger.error('Invalid webhook signature', {
        signaturePreview: signature.substring(0, 20),
      });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // ============================================
    // Stage 2: Parse webhook payload
    // ============================================
    let payload;
    try {
      payload = JSON.parse(rawPayload);
    } catch (error) {
      logger.error('Invalid webhook payload JSON', { rawPayload: rawPayload.substring(0, 100) });
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const eventType = payload.type || payload.event;
    logger.debug('Webhook received', { eventType, payloadId: payload.id });

    // ============================================
    // Stage 3: Route to appropriate handler
    // ============================================
    const handler = webhookHandlers[eventType];

    if (handler) {
      await handler(payload);
      logger.info('Webhook processed', {
        eventType,
        duration: Date.now() - requestStartTime,
      });
    } else {
      logger.debug('Unhandled webhook event type', { eventType });
      // Return 200 for unhandled events (don't retry)
    }

    // ============================================
    // Stage 4: Acknowledge webhook
    // ============================================
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    logger.error('Webhook processing failed', error, {
      duration: Date.now() - requestStartTime,
    });

    // Return 500 to trigger retry
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
