/**
 * Server-Side Subscription Queries
 * Subscription management database operations
 */

import { createAdminClient } from '@/lib/supabase/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';
import type { Subscription } from '@/lib/types';

const logger = createScopedLogger('db/subscriptions.server');

/**
 * Get user subscription (server-side)
 */
export async function getUserSubscriptionServerSide(
  userId: string
): Promise<Subscription | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    const userMessage = handleDbError(error, 'db/subscriptions.server/getUserSubscriptionServerSide');
    logger.error('Error fetching subscription', error, { userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    user_id: data.user_id,
    plan: data.plan as 'free' | 'pro',
    status: data.status as 'active' | 'cancelled' | 'expired' | 'trial',
    current_period_start: data.current_period_start ?? undefined,
    current_period_end: data.current_period_end ?? undefined,
    cancel_at_period_end: data.cancel_at_period_end,
    created_at: data.created_at,
    updated_at: data.updated_at,
    // Dodo Payments fields
    dodo_customer_id: data.dodo_customer_id ?? undefined,
    dodo_subscription_id: data.dodo_subscription_id ?? undefined,
    last_payment_at: data.last_payment_at ?? undefined,
    next_billing_at: data.next_billing_at ?? undefined,
    cancelled_at: data.cancelled_at ?? undefined,
  };
}

/**
 * Update user subscription (server-side)
 * Used by webhooks and admin operations
 */
export async function updateSubscriptionServerSide(
  userId: string,
  subscription: Partial<Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Subscription> {
  const supabase = await createAdminClient();

  // Validate subscription period dates
  // If both dates are provided, end must be after start
  // If only one date is provided, that's invalid (both or neither)
  if (subscription.current_period_start && subscription.current_period_end) {
    const start = new Date(subscription.current_period_start);
    const end = new Date(subscription.current_period_end);
    if (end <= start) {
      logger.error('Invalid subscription period: end must be after start', { userId, start, end });
      throw new Error('Invalid subscription period: end date must be after start date');
    }
  } else if (
    (subscription.current_period_start && !subscription.current_period_end) ||
    (!subscription.current_period_start && subscription.current_period_end)
  ) {
    // Only one date provided - invalid
    logger.error('Invalid subscription period: both start and end dates must be provided together', { userId });
    throw new Error('Invalid subscription period: both start and end dates must be provided together, or neither');
  }

  // Check if subscription exists
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Update existing subscription - include Dodo Payments fields
    const updateData: any = {
      plan: subscription.plan,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
    };

    // Add Dodo Payments fields if provided
    if (subscription.dodo_customer_id !== undefined) updateData.dodo_customer_id = subscription.dodo_customer_id;
    if (subscription.dodo_subscription_id !== undefined) updateData.dodo_subscription_id = subscription.dodo_subscription_id;
    if (subscription.last_payment_at !== undefined) updateData.last_payment_at = subscription.last_payment_at;
    if (subscription.next_billing_at !== undefined) updateData.next_billing_at = subscription.next_billing_at;
    if (subscription.cancelled_at !== undefined) updateData.cancelled_at = subscription.cancelled_at;

    // Log raw update data BEFORE attempting update
    logger.info('Attempting subscription update', {
      userId,
      updateData: JSON.stringify(updateData),
      hasPlan: !!subscription.plan,
      hasStatus: !!subscription.status,
      hasPeriodStart: !!subscription.current_period_start,
      hasPeriodEnd: !!subscription.current_period_end,
      hasDodoCustomerId: !!subscription.dodo_customer_id,
      hasDodoSubscriptionId: !!subscription.dodo_subscription_id,
    });

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      // Log RAW error first (before handleDbError modifies it)
      console.error('RAW DATABASE ERROR:', JSON.stringify(error, null, 2));
      logger.error('Error updating subscription', {
        userId,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        fullError: JSON.stringify(error),
      });
      const userMessage = handleDbError(error, 'db/subscriptions.server/updateSubscriptionServerSide');
      const dbError = new Error(userMessage);
      throw dbError;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      plan: data.plan as 'free' | 'pro',
      status: data.status as 'active' | 'cancelled' | 'expired' | 'trial',
      current_period_start: data.current_period_start ?? undefined,
      current_period_end: data.current_period_end ?? undefined,
      cancel_at_period_end: data.cancel_at_period_end,
      created_at: data.created_at,
      updated_at: data.updated_at,
      // Dodo Payments fields
      dodo_customer_id: data.dodo_customer_id ?? undefined,
      dodo_subscription_id: data.dodo_subscription_id ?? undefined,
      last_payment_at: data.last_payment_at ?? undefined,
      next_billing_at: data.next_billing_at ?? undefined,
      cancelled_at: data.cancelled_at ?? undefined,
    };
  } else {
    // Create new subscription - include Dodo Payments fields
    const insertData: any = {
      user_id: userId,
      plan: subscription.plan ?? 'free',
      status: subscription.status ?? 'active',
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    };

    // Add Dodo Payments fields if provided
    if (subscription.dodo_customer_id !== undefined) insertData.dodo_customer_id = subscription.dodo_customer_id;
    if (subscription.dodo_subscription_id !== undefined) insertData.dodo_subscription_id = subscription.dodo_subscription_id;
    if (subscription.last_payment_at !== undefined) insertData.last_payment_at = subscription.last_payment_at;
    if (subscription.next_billing_at !== undefined) insertData.next_billing_at = subscription.next_billing_at;
    if (subscription.cancelled_at !== undefined) insertData.cancelled_at = subscription.cancelled_at;

    const { data, error } = await supabase
      .from('subscriptions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating subscription', {
        userId,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        fullError: JSON.stringify(error),
      });
      const userMessage = handleDbError(error, 'db/subscriptions.server/updateSubscriptionServerSide');
      const dbError = new Error(userMessage);
      throw dbError;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      plan: data.plan as 'free' | 'pro',
      status: data.status as 'active' | 'cancelled' | 'expired' | 'trial',
      current_period_start: data.current_period_start ?? undefined,
      current_period_end: data.current_period_end ?? undefined,
      cancel_at_period_end: data.cancel_at_period_end,
      created_at: data.created_at,
      updated_at: data.updated_at,
      // Dodo Payments fields
      dodo_customer_id: data.dodo_customer_id ?? undefined,
      dodo_subscription_id: data.dodo_subscription_id ?? undefined,
      last_payment_at: data.last_payment_at ?? undefined,
      next_billing_at: data.next_billing_at ?? undefined,
      cancelled_at: data.cancelled_at ?? undefined,
    };
  }
}

