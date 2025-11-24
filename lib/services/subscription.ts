/**
 * Subscription Service
 * Business logic for subscription management and Pro feature gating
 */

import { getUserSubscriptionServerSide, updateSubscriptionServerSide } from '@/lib/db/queries.server';
import { createScopedLogger } from '@/lib/utils/logger';
import type { Subscription } from '@/lib/types';

const logger = createScopedLogger('services/subscription');

/**
 * Check if user has active Pro subscription
 * @param userId - User ID
 * @returns True if user has active Pro or Premium subscription
 */
export async function isProUser(userId: string): Promise<boolean> {
  try {
    const subscription = await getUserSubscriptionServerSide(userId);

    if (!subscription) {
      return false;
    }

    // Check if subscription is active
    if (subscription.status !== 'active') {
      return false;
    }

    // Check if plan is Pro or Premium
    if (subscription.plan === 'free') {
      return false;
    }

    // Check if subscription period has ended
    if (subscription.current_period_end) {
      const periodEnd = new Date(subscription.current_period_end);
      if (periodEnd < new Date()) {
        logger.debug('Subscription period ended', { userId, periodEnd });
        return false;
      }
    }

    logger.debug('User is Pro', { userId, plan: subscription.plan });
    return true;
  } catch (error) {
    logger.error('Error checking Pro status', error, { userId });
    // Fail secure - return false on error
    return false;
  }
}

/**
 * Get user subscription details
 * @param userId - User ID
 * @returns Subscription object or null if no subscription
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  try {
    return await getUserSubscriptionServerSide(userId);
  } catch (error) {
    logger.error('Error getting subscription', error, { userId });
    return null;
  }
}

/**
 * Update subscription (used by webhooks)
 * @param userId - User ID
 * @param subscription - Subscription updates
 * @returns Updated subscription
 */
export async function updateSubscription(
  userId: string,
  subscription: Partial<Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Subscription> {
  try {
    return await updateSubscriptionServerSide(userId, subscription);
  } catch (error) {
    logger.error('Error updating subscription', error, { userId });
    throw error;
  }
}

/**
 * Check if subscription is active and valid
 * @param subscription - Subscription object
 * @returns True if subscription is active and not expired
 */
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) {
    return false;
  }

  if (subscription.status !== 'active') {
    return false;
  }

  if (subscription.current_period_end) {
    const periodEnd = new Date(subscription.current_period_end);
    if (periodEnd < new Date()) {
      return false;
    }
  }

  return true;
}

