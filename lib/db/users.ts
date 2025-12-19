/**
 * Client-Side User Queries
 * User profile-related database operations for client-side use
 */

import { createClient } from '@/lib/supabase/client';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';

const logger = createScopedLogger('db/users');

/**
 * Update user profile (client-side)
 */
export async function updateUserProfile(
  userId: string,
  updates: { name?: string; avatar_url?: string }
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) {
    const userMessage = handleDbError(error, 'db/users/updateUserProfile');
    logger.error('Error updating user profile', error, { userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }
}

