/**
 * Account Management Service
 * Business logic for account deletion and data management
 */

import {
  deleteUserAccountServerSide,
  clearAllConversationsServerSide,
} from '@/lib/db/queries.server';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('services/account-management');

/**
 * Delete user account and all related data
 * WARNING: This is a destructive operation that cannot be undone
 * @param userId - User ID
 * @returns Promise that resolves when deletion completes
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  try {
    logger.warn('User account deletion initiated', { userId });
    await deleteUserAccountServerSide(userId);
    logger.info('User account deleted successfully', { userId });
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

