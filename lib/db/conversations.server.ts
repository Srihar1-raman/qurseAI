/**
 * Server-Side Conversation Queries
 * Conversation-related database operations
 */

import { createClient } from '@/lib/supabase/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';

const logger = createScopedLogger('db/conversations.server');

/**
 * Ensure conversation exists (server-side)
 */
export async function ensureConversationServerSide(
  conversationId: string,
  userId: string,
  title: string
): Promise<void> {
  const supabase = await createClient();

  try {
    const { data: existing, error: checkError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (checkError) {
      const userMessage = handleDbError(checkError, 'db/conversations.server/ensureConversationServerSide');
      logger.error('Error checking conversation', checkError, { conversationId, userId });
      const dbError = new Error(userMessage);
      throw dbError;
    }

    if (existing) {
      if (existing.user_id !== userId) {
        logger.warn('Unauthorized conversation access attempt', { conversationId, userId, ownerId: existing.user_id });
        throw new Error('Conversation belongs to another user');
      }
      return;
    }

    const { error: insertError } = await supabase.from('conversations').insert({
      id: conversationId,
      user_id: userId,
      title,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: verify } = await supabase
          .from('conversations')
          .select('user_id')
          .eq('id', conversationId)
          .maybeSingle();

        if (verify && verify.user_id === userId) {
          logger.debug('Conversation created by another request', { conversationId });
          return;
        }
        throw new Error('Conversation ID conflict');
      }
      const userMessage = handleDbError(insertError, 'db/conversations.server/ensureConversationServerSide');
      logger.error('Error creating conversation', insertError, { conversationId, userId });
      const dbError = new Error(userMessage);
      throw dbError;
    }
  } catch (error) {
    const userMessage = handleDbError(error, 'db/conversations.server/ensureConversationServerSide');
    logger.error('Error ensuring conversation', error, { conversationId, userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }
}

/**
 * Update conversation title (server-side)
 * Used for background title generation updates
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string,
  supabaseClient?: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  const supabase = supabaseClient || await createClient();

  const { error } = await supabase
    .from('conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  if (error) {
    const userMessage = handleDbError(error, 'db/conversations.server/updateConversationTitle');
    logger.error('Error updating conversation title', error, { conversationId, title });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  logger.debug('Conversation title updated', { conversationId, title });
}

/**
 * Get total count of conversations for a user (server-side)
 * Fast COUNT query - no data transfer, just count
 * @param userId - User ID
 * @returns Total number of conversations
 */
export async function getConversationCountServerSide(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    const userMessage = handleDbError(error, 'db/conversations.server/getConversationCountServerSide');
    logger.error('Error fetching conversation count', error, { userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  return count || 0;
}

/**
 * Check conversation access (read-only)
 * Validates if conversation exists and belongs to user
 * Does NOT create conversation (unlike ensureConversationServerSide)
 * 
 * @param conversationId - Conversation ID to check
 * @param userId - User ID to verify ownership
 * @param supabaseClient - Optional Supabase client (creates one if not provided)
 * @returns Object with exists, belongsToUser flags and conversation data if exists
 */
export async function checkConversationAccess(
  conversationId: string,
  userId: string,
  supabaseClient?: Awaited<ReturnType<typeof createClient>>
): Promise<{
  exists: boolean;
  belongsToUser: boolean;
  error?: boolean; // Indicates database error occurred (fail-secure)
  conversation?: { id: string; user_id: string };
}> {
  const supabase = supabaseClient || await createClient();

  try {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (error) {
      const userMessage = handleDbError(error, 'db/conversations.server/checkConversationAccess');
      logger.error('Error checking conversation access', error, { conversationId, userId });
      // Return error flag for fail-secure handling (distinguish from "doesn't exist")
      return { exists: false, belongsToUser: false, error: true };
    }

    if (!conversation) {
      // Conversation does not exist (valid case - not an error)
      return { exists: false, belongsToUser: false, error: false };
    }

    // Conversation exists - check ownership
    const belongsToUser = conversation.user_id === userId;

    return {
      exists: true,
      belongsToUser,
      error: false,
      conversation: {
        id: conversation.id,
        user_id: conversation.user_id,
      },
    };
  } catch (error) {
    logger.error('Error in checkConversationAccess', error, { conversationId, userId });
    // Return error flag for fail-secure handling
    return { exists: false, belongsToUser: false, error: true };
  }
}

/**
 * Clear all conversations for a user (server-side)
 */
export async function clearAllConversationsServerSide(
  userId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('user_id', userId);

  if (error) {
    const userMessage = handleDbError(error, 'db/conversations.server/clearAllConversationsServerSide');
    logger.error('Error clearing conversations', error, { userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  logger.info('All conversations cleared', { userId });
}

