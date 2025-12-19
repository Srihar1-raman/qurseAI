/**
 * Server-Side Conversation Queries
 * Conversation-related database operations
 */

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';
import { getSharedMessagesServerSide } from '@/lib/db/messages.server';

const logger = createScopedLogger('db/conversations.server');

// Service role client for public/shared data access (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase service credentials: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const serviceSupabase = createServiceClient(supabaseUrl, serviceKey);

/**
 * Ensure conversation exists (server-side)
 * @param conversationId - Conversation ID
 * @param userId - User ID
 * @param title - Conversation title
 * @param supabaseClient - Optional Supabase client (creates one if not provided)
 */
export async function ensureConversationServerSide(
  conversationId: string,
  userId: string,
  title: string,
  supabaseClient?: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  const supabase = supabaseClient || await createClient();

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

/**
 * Get shared conversation by share token
 * Uses service role client to bypass RLS for public access
 * @param shareToken - Share token (UUID)
 * @returns Conversation data and message count, or null if not found
 */
export async function getSharedConversationByToken(
  shareToken: string
): Promise<{
  conversation: {
    id: string;
    title: string;
    updated_at: string;
    created_at: string | null;
    user_id: string;
    share_token: string | null;
    shared_at: string | null;
    is_shared: boolean;
    shared_message_count: number | null;
  } | null;
  messageCount: number;
} | null> {
  // Use service role client to bypass RLS for public shared conversations
  try {
    const { data: conversation, error } = await serviceSupabase
      .from('conversations')
      .select('id, title, updated_at, created_at, user_id, share_token, shared_at, is_shared, shared_message_count')
      .eq('share_token', shareToken)
      .eq('is_shared', true)
      .maybeSingle();

    if (error) {
      const userMessage = handleDbError(error, 'db/conversations.server/getSharedConversationByToken');
      logger.error('Error fetching shared conversation', error, { shareToken });
      throw new Error(userMessage);
    }

    if (!conversation || !conversation.is_shared) {
      return null;
    }

    return {
      conversation,
      messageCount: conversation.shared_message_count || 0,
    };
  } catch (error) {
    logger.error('Error in getSharedConversationByToken', error, { shareToken });
    throw error;
  }
}

/**
 * Fork shared conversation - create new conversation with copied messages
 * @param shareToken - Share token (UUID)
 * @param userId - User ID to create conversation for
 * @param supabaseClient - Optional Supabase client
 * @returns New conversation ID
 */
export async function forkSharedConversation(
  shareToken: string,
  userId: string,
  supabaseClient?: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const supabase = supabaseClient || await createClient();

  try {
    // Get shared conversation (uses service role client internally)
    const sharedData = await getSharedConversationByToken(shareToken);
    if (!sharedData || !sharedData.conversation) {
      throw new Error('Shared conversation not found');
    }

    const { conversation: sharedConv, messageCount } = sharedData;

    // Get messages up to shared_message_count (uses service role client internally)
    const sharedMessages = await getSharedMessagesServerSide(sharedConv.id, messageCount);

    // Create new conversation with title appended with " (Shared)"
    const newTitle = `${sharedConv.title} (Shared)`;
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: newTitle,
      })
      .select('id')
      .single();

    if (createError) {
      const userMessage = handleDbError(createError, 'db/conversations.server/forkSharedConversation');
      logger.error('Error creating forked conversation', createError, { userId, shareToken });
      throw new Error(userMessage);
    }

    const newConversationId = newConversation.id;

    // Copy all messages to new conversation
    // Note: We don't copy the message ID - let the database generate new IDs
    // We preserve created_at to maintain chronological order
    if (sharedMessages && sharedMessages.length > 0) {
      // Extract text content from parts for legacy content field
      const messagesToInsert = sharedMessages.map((msg) => {
        const contentText = msg.parts
          ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
          .map((p) => p.text)
          .join('') || '';

        return {
          conversation_id: newConversationId,
          role: msg.role,
          content: contentText,
          parts: msg.parts,
          model: msg.model || null,
          input_tokens: msg.input_tokens || null,
          output_tokens: msg.output_tokens || null,
          total_tokens: msg.total_tokens || null,
          completion_time: msg.completion_time || null,
          created_at: msg.created_at, // Preserve original timestamp for correct ordering
        };
      });

      const { error: insertError } = await supabase
        .from('messages')
        .insert(messagesToInsert);

      if (insertError) {
        const userMessage = handleDbError(insertError, 'db/conversations.server/forkSharedConversation');
        logger.error('Error copying messages to forked conversation', insertError, { newConversationId });
        throw new Error(userMessage);
      }
    }

    logger.info('Shared conversation forked', { shareToken, newConversationId, messageCount: sharedMessages?.length || 0 });
    return newConversationId;
  } catch (error) {
    logger.error('Error in forkSharedConversation', error, { shareToken, userId });
    throw error;
  }
}

