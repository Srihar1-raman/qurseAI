/**
 * Account Management Service
 * Business logic for account deletion and data management
 */

import {
  deleteUserAccountServerSide,
  clearAllConversationsServerSide,
} from '@/lib/db/queries.server';
import { getUserSubscriptionServerSide } from '@/lib/db/subscriptions.server';
import {
  cancelDodoSubscriptionForDeletion,
  shouldCancelSubscription,
} from '@/lib/services/dodo-subscriptions';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('services/account-management');

/**
 * Delete user account and all related data
 *
 * Process:
 * 1. Cancel Dodo subscription (if active Pro user)
 * 2. Delete account from database (CASCADE DELETE to all tables)
 *
 * WARNING: This is a destructive operation that cannot be undone
 *
 * Graceful Degradation:
 * - If Dodo cancellation fails, account deletion proceeds anyway
 * - This ensures GDPR compliance (account deletion is legal requirement)
 * - Failed cancellations are logged for manual reconciliation
 *
 * @param userId - User ID
 * @returns Promise that resolves when deletion completes
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  try {
    logger.warn('User account deletion initiated', { userId });

    // ============================================
    // Step 1: Cancel Dodo subscription (if applicable)
    // ============================================
    let dodoCancellationResult: {
      attempted: boolean;
      success: boolean;
      error?: string;
    } = {
      attempted: false,
      success: false,
    };

    try {
      const subscription = await getUserSubscriptionServerSide(userId);

      if (subscription && shouldCancelSubscription(subscription)) {
        dodoCancellationResult.attempted = true;

        await cancelDodoSubscriptionForDeletion(
          subscription.dodo_subscription_id!,
          userId
        );

        dodoCancellationResult.success = true;
        logger.info('Dodo subscription cancelled successfully', {
          userId,
          dodoSubscriptionId: subscription.dodo_subscription_id,
        });
      } else {
        logger.info('Dodo subscription cancellation skipped', {
          userId,
          reason: subscription
            ? `Status: ${subscription.status}, Has Dodo ID: ${!!subscription.dodo_subscription_id}`
            : 'No subscription found',
          subscriptionStatus: subscription?.status,
          hasDodoSubscriptionId: subscription ? !!subscription.dodo_subscription_id : false,
        });
      }
    } catch (dodoError) {
      // Log Dodo cancellation failure but DO NOT block account deletion
      // Account deletion is a legal requirement (GDPR) and must proceed
      dodoCancellationResult.error = dodoError instanceof Error
        ? dodoError.message
        : 'Unknown error';

      logger.error('Dodo subscription cancellation failed, proceeding with account deletion', dodoError, {
        userId,
        dodoCancellationResult,
        note: 'Account deletion will continue despite Dodo cancellation failure. Manual reconciliation may be needed.',
      });
    }

    // ============================================
    // Step 2: Delete account from database
    // ============================================
    await deleteUserAccountServerSide(userId);

    logger.info('User account deleted successfully', {
      userId,
      dodoCancellationResult,
    });

  } catch (error) {
    logger.error('Error deleting user account', error, { userId });
    throw error;
  }
}

/**
 * Clear all conversations for a user
 * WARNING: This is a destructive operation that cannot be undone
 * @param userId - User ID
 * @returns Promise that resolves when clearing completes
 */
export async function clearAllConversations(userId: string): Promise<void> {
  try {
    logger.info('Clearing all conversations', { userId });
    await clearAllConversationsServerSide(userId);
    logger.info('All conversations cleared successfully', { userId });
  } catch (error) {
    logger.error('Error clearing conversations', error, { userId });
    throw error;
  }
}

