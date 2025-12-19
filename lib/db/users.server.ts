/**
 * Server-Side User Queries
 * User profile and account management operations
 */

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';

const logger = createScopedLogger('db/users.server');

// Service role client for admin operations (auth.users deletion)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase service credentials: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const serviceSupabase = createServiceClient(supabaseUrl, serviceKey);

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
 * 
 * This function performs a complete account deletion:
 * 1. Deletes from auth.users (using service role) - this triggers CASCADE DELETE
 * 2. CASCADE DELETE automatically removes:
 *    - users table (via auth.users FK with ON DELETE CASCADE)
 *    - conversations (via user_id FK with ON DELETE CASCADE)
 *    - messages (via conversation_id FK with ON DELETE CASCADE)
 *    - user_preferences (via user_id FK with ON DELETE CASCADE)
 *    - subscriptions (via user_id FK with ON DELETE CASCADE)
 *    - rate_limits (via user_id FK with ON DELETE CASCADE)
 * 
 * Root cause fix: Deletes from auth.users first, which cascades to everything else.
 */
export async function deleteUserAccountServerSide(
  userId: string
): Promise<void> {
  // Delete from auth.users using service role (bypasses RLS)
  // This will CASCADE DELETE to users table, which cascades to all related tables
  const { error: authError } = await serviceSupabase.auth.admin.deleteUser(userId);

  if (authError) {
    const userMessage = handleDbError(authError, 'db/users.server/deleteUserAccountServerSide');
    logger.error('Error deleting user from auth.users', authError, { userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  logger.info('User account deleted completely (auth.users + all related data)', { userId });
}

