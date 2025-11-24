/**
 * User Profile Service
 * Business logic for managing user profile updates
 */

import { updateUserProfileServerSide } from '@/lib/db/queries.server';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('services/user-profile');

/**
 * Update user profile
 * @param userId - User ID
 * @param updates - Profile updates (name, avatar_url)
 * @returns Promise that resolves when update completes
 */
export async function updateUserProfile(
  userId: string,
  updates: { name?: string; avatar_url?: string }
): Promise<void> {
  try {
    // Validate name if provided
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (trimmedName.length === 0) {
        throw new Error('Name cannot be empty');
      }
      if (trimmedName.length > 100) {
        throw new Error('Name must be 100 characters or less');
      }
      updates.name = trimmedName;
    }

    // Validate avatar_url if provided
    if (updates.avatar_url !== undefined && updates.avatar_url.length > 0) {
      try {
        new URL(updates.avatar_url);
      } catch {
        throw new Error('Invalid avatar URL format');
      }
    }

    await updateUserProfileServerSide(userId, updates);
    logger.info('User profile updated', { userId, fields: Object.keys(updates) });
  } catch (error) {
    logger.error('Error updating user profile', error, { userId });
    throw error;
  }
}

