/**
 * Server-Side User Queries
 * User profile and account management operations
 */

import { createClient } from '@/lib/supabase/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';

const logger = createScopedLogger('db/users.server');

/**
 * Update user profile (server-side)
 */
export async function updateUserProfileServerSide(
  userId: string,
  updates: { name?: string; avatar_url?: string }
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) {
    const userMessage = handleDbError(error, 'db/users.server/updateUserProfileServerSide');
    logger.error('Error updating user profile', error, { userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  logger.debug('User profile updated', { userId });
}

/**
 * Delete user account and all related data (server-side only)
 * Uses CASCADE DELETE to remove all related records
 * 
 * NOTE: This only deletes from the `users` table, which cascades to:
 * - conversations (via user_id FK)
 * - messages (via conversation_id FK)
 * - user_preferences (via user_id FK)
 * - subscriptions (via user_id FK)
 * - rate_limits (via user_id FK)
 * 
 * The user record in `auth.users` is NOT deleted by this function.
 * To fully delete from auth.users, you need:
 * 1. Service role key (SUPABASE_SERVICE_ROLE_KEY)
 * 2. Admin API call: supabase.auth.admin.deleteUser(userId)
 * 
 * This is intentional - auth.users deletion should be handled separately
 * for security and audit purposes.
 */
export async function deleteUserAccountServerSide(
  userId: string
): Promise<void> {
  const supabase = await createClient();

  // Delete user from users table (this will CASCADE delete all related data)
  // Note: auth.users deletion requires service role key and should be handled separately
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) {
    const userMessage = handleDbError(error, 'db/users.server/deleteUserAccountServerSide');
    logger.error('Error deleting user account', error, { userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  logger.info('User account deleted (from users table)', { userId });
}

