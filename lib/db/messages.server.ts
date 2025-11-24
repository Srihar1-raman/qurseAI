/**
 * Server-Side Message Queries
 * Message-related database operations
 */

import { createClient } from '@/lib/supabase/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';
import { convertLegacyContentToParts, type MessageParts } from '@/lib/utils/message-parts-fallback';

const logger = createScopedLogger('db/messages.server');

/**
 * Get messages for a conversation with optional pagination
 * @param conversationId - Conversation ID
 * @param options - Pagination options (limit, offset)
 * @returns Object with messages array and hasMore flag (default limit: 50, ordered ascending by created_at)
 */
export async function getMessagesServerSide(
  conversationId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ 
  messages: Array<{ id: string; role: 'user' | 'assistant'; parts: MessageParts; model?: string; input_tokens?: number; output_tokens?: number; total_tokens?: number; completion_time?: number }>;
  hasMore: boolean;
  dbRowCount: number; // Actual rows queried from DB (for accurate offset calculation)
}> {
  const supabase = await createClient();

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  // Query newest first (DESC), then reverse array to maintain ascending order
  let query = supabase
    .from('messages')
    .select('id, role, content, parts, created_at, model, input_tokens, output_tokens, total_tokens, completion_time')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });
  
  // Use range() for pagination (handles both offset and limit)
  // When offset = 0, range(0, limit - 1) = first 'limit' rows
  if (offset > 0) {
    query = query.range(offset, offset + limit - 1);
  } else {
    query = query.range(0, limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    const userMessage = handleDbError(error, 'db/messages.server/getMessagesServerSide');
    logger.error('Error fetching messages', error, { conversationId, limit, offset });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  const filtered = (data || [])
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant');
  
  // If we got fewer rows than requested, there are no more messages in DB
  const hasMore = (data?.length || 0) >= limit;
  const actualDbRowCount = data?.length || 0; // Track actual rows queried from DB
  
  // Reverse array to maintain ascending order (oldest first) for display
  const reversed = filtered.reverse();
  
  logger.debug('Messages fetched', { 
    conversationId, 
    total: actualDbRowCount, 
    filtered: filtered.length,
    hasMore,
    limit,
    offset
  });

  const messages = reversed.map((msg) => {
    let parts: MessageParts = [];
    
    // Prefer parts array (new format)
    if (msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0) {
      parts = msg.parts as MessageParts;
    } else {
      // Fallback: Convert legacy content/reasoning format to parts array
      parts = convertLegacyContentToParts(msg.content);
    }
    
    return {
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      parts: parts,
      model: msg.model ?? undefined,
      input_tokens: msg.input_tokens ?? undefined,
      output_tokens: msg.output_tokens ?? undefined,
      total_tokens: msg.total_tokens ?? undefined,
      completion_time: msg.completion_time ?? undefined,
    };
  });

  return {
    messages,
    hasMore,
    dbRowCount: actualDbRowCount, // Return actual DB rows queried for accurate offset calculation
  };
}

/**
 * Count messages for a user today (for rate limiting)
 * @param userId - User ID (null for anonymous)
 * @returns Number of messages sent today
 */
export async function countMessagesTodayServerSide(
  userId: string | null
): Promise<number> {
  const supabase = await createClient();

  // Use UTC for consistent timezone handling
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  if (userId) {
    // First, get all user's conversation IDs
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId);

    if (convError) {
      const userMessage = handleDbError(convError, 'db/messages.server/countMessagesTodayServerSide');
      logger.error('Error fetching conversations for rate limit', convError, { userId });
      const dbError = new Error(userMessage);
      throw dbError;
    }

    // If no conversations, return 0
    if (!conversations || conversations.length === 0) {
      return 0;
    }

    const conversationIds = conversations.map(c => c.id);

    // Count messages in those conversations
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user')
      .gte('created_at', todayISO)
      .in('conversation_id', conversationIds);

    if (error) {
      const userMessage = handleDbError(error, 'db/messages.server/countMessagesTodayServerSide');
      logger.error('Error counting messages today', error, { userId });
      const dbError = new Error(userMessage);
      throw dbError;
    }

    return count || 0;
  } else {
    // For anonymous users, we can't track by user_id
    // We'll need to track via IP or session - for now return 0
    // This will be handled by rate_limits table when implemented
    return 0;
  }
}

