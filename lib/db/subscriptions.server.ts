/**
 * Server-Side Subscription Queries
 * Subscription management database operations
 */

import { createClient } from '@/lib/supabase/server';
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
  const supabase = await createClient();

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
    plan: data.plan as 'free' | 'pro' | 'premium',
    status: data.status as 'active' | 'cancelled' | 'expired' | 'trial',
    current_period_start: data.current_period_start ?? undefined,
    current_period_end: data.current_period_end ?? undefined,
    cancel_at_period_end: data.cancel_at_period_end,
    created_at: data.created_at,
    updated_at: data.updated_at,
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
  const supabase = await createClient();

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
    // Update existing subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .update(subscription)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      const userMessage = handleDbError(error, 'db/subscriptions.server/updateSubscriptionServerSide');
      logger.error('Error updating subscription', error, { userId });
      const dbError = new Error(userMessage);
      throw dbError;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      plan: data.plan as 'free' | 'pro' | 'premium',
      status: data.status as 'active' | 'cancelled' | 'expired' | 'trial',
      current_period_start: data.current_period_start ?? undefined,
      current_period_end: data.current_period_end ?? undefined,
      cancel_at_period_end: data.cancel_at_period_end,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } else {
    // Create new subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan: subscription.plan ?? 'free',
        status: subscription.status ?? 'active',
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      })
      .select()
      .single();

    if (error) {
      const userMessage = handleDbError(error, 'db/subscriptions.server/updateSubscriptionServerSide');
      logger.error('Error creating subscription', error, { userId });
      const dbError = new Error(userMessage);
      throw dbError;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      plan: data.plan as 'free' | 'pro' | 'premium',
      status: data.status as 'active' | 'cancelled' | 'expired' | 'trial',
      current_period_start: data.current_period_start ?? undefined,
      current_period_end: data.current_period_end ?? undefined,
      cancel_at_period_end: data.cancel_at_period_end,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }
}

