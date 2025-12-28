/**
 * Subscription Service
 * Business logic for subscription management and Pro feature gating
 * Updated to support grace period and auto-downgrade
 */

import { getUserSubscriptionServerSide, updateSubscriptionServerSide } from '@/lib/db/queries.server';
import { createScopedLogger } from '@/lib/utils/logger';
import type { Subscription, SubscriptionAccessResult } from '@/lib/types';
import { calculateSubscriptionAccess } from './subscription/subscription-access.service';

const logger = createScopedLogger('services/subscription');

/**
 * Check if user has active Pro subscription (with grace period support)
 *
 * This function now respects the grace period:
 * - Active subscriptions → Check next_billing_at
 * - Cancelled subscriptions → Keep access until next_billing_at (grace period)
 * - Expired subscriptions → No access
 *
 * @param userId - User ID
 * @returns True if user has Pro access (including grace period)
 */
export async function isProUser(userId: string): Promise<boolean> {
  try {
    const subscription = await getUserSubscriptionServerSide(userId);

    // Use new pure function for access calculation
    const accessResult = calculateSubscriptionAccess(subscription);

    logger.debug('Pro access check', {
      userId,
      hasAccess: accessResult.hasAccess,
      reason: accessResult.reason,
      isInGracePeriod: accessResult.isInGracePeriod,
    });

    return accessResult.hasAccess;
  } catch (error) {
    logger.error('Error checking Pro status', error, { userId });
    // Fail secure - return false on error
    return false;
  }
}

/**
 * Get detailed subscription access information
 * Returns detailed access result for debugging and UI display
 *
 * @param userId - User ID
 * @returns SubscriptionAccessResult with detailed access information
 */
export async function getSubscriptionAccess(
  userId: string
): Promise<SubscriptionAccessResult> {
  try {
    const subscription = await getUserSubscriptionServerSide(userId);
    return calculateSubscriptionAccess(subscription);
  } catch (error) {
    logger.error('Error getting subscription access', error, { userId });
    // Return no access on error
    return {
      hasAccess: false,
      reason: 'no_subscription',
      plan: 'free',
      status: 'active',
      isInGracePeriod: false,
    };
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
 * Check if subscription is active and valid (UPDATED for grace period support)
 * @param subscription - Subscription object
 * @returns True if subscription is active and not expired
 *
 * This function now uses calculateSubscriptionAccess() which includes grace period logic.
 * Cancelled users with active billing periods will return true.
 */
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  return calculateSubscriptionAccess(subscription).hasAccess;
}

