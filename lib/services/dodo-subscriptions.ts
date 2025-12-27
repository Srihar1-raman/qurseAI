/**
 * Dodo Payments Subscription Operations
 * Centralized service for Dodo subscription management
 */

import { dodoClient } from '@/lib/dodo-client';
import { createScopedLogger } from '@/lib/utils/logger';
import type { Subscription } from '@/lib/types';

const logger = createScopedLogger('services/dodo-subscriptions');

/**
 * Cancel Dodo subscription immediately for account deletion
 * This is used during account deletion to ensure users are not charged after deleting their account
 *
 * @param dodoSubscriptionId - Dodo subscription ID to cancel
 * @param userId - User ID for logging purposes
 * @throws Error if cancellation fails or Dodo client not initialized
 *
 * Usage:
 *   try {
 *     await cancelDodoSubscriptionForDeletion(subscriptionId, userId);
 *   } catch (error) {
 *     // Log error but proceed with deletion (graceful degradation)
 *   }
 */
export async function cancelDodoSubscriptionForDeletion(
  dodoSubscriptionId: string,
  userId: string
): Promise<void> {
  if (!dodoClient) {
    throw new Error('Dodo Payments client not initialized');
  }

  logger.warn('Cancelling Dodo subscription for account deletion', {
    userId,
    dodoSubscriptionId,
  });

  try {
    // Cancel subscription immediately (not at period end)
    // This is appropriate for account deletion where user expects complete termination
    await dodoClient.subscriptions.update(dodoSubscriptionId, {
      status: 'cancelled',
    });

    logger.info('Dodo subscription cancelled successfully', {
      userId,
      dodoSubscriptionId,
    });
  } catch (error) {
    logger.error('Failed to cancel Dodo subscription', error, {
      userId,
      dodoSubscriptionId,
      errorType: error instanceof Error ? error.name : 'unknown',
    });
    throw error;
  }
}

/**
 * Check if subscription cancellation should be attempted
 * Prevents unnecessary API calls and handles edge cases
 *
 * @param subscription - User subscription record
 * @returns true if cancellation should be attempted, false otherwise
 *
 * Cancellation is skipped when:
 * - No subscription exists (free user)
 * - Subscription has no dodo_subscription_id (local only)
 * - Subscription already cancelled or expired
 * - Subscription not in active state (pending, failed, on_hold)
 */
export function shouldCancelSubscription(
  subscription: Subscription | null
): boolean {
  // No subscription exists (free user)
  if (!subscription) {
    return false;
  }

  // No Dodo subscription ID (local subscription only)
  if (!subscription.dodo_subscription_id) {
    return false;
  }

  // Already cancelled or expired
  if (subscription.status === 'cancelled' || subscription.status === 'expired') {
    return false;
  }

  // Not in active state (pending, failed, on_hold, etc.)
  if (subscription.status !== 'active') {
    return false;
  }

  // Active Dodo subscription - should cancel
  return true;
}
