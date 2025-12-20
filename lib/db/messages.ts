/**
 * Client-Side Message Queries
 * Message-related database operations for client-side use
 */

import { createClient } from '@/lib/supabase/client';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';
import { convertLegacyContentToParts, type MessageParts } from '@/lib/utils/message-parts-fallback';

const logger = createScopedLogger('db/messages');

/**
 * Get older messages for a conversation (client-side)
 * Used for scroll-up pagination
 * @param conversationId - Conversation ID
 * @param limit - Number of messages to load
 * @param offset - Offset for pagination (number of messages already loaded)
 * @returns Object with messages array and hasMore flag
 */
export async function getOlderMessages(
  conversationId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ 
  messages: Array<{ 
    id: string; 
    role: 'user' | 'assistant' | 'tool'; 
    parts: MessageParts; 
    model?: string;
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    completion_time?: number;
  }>;
  hasMore: boolean;
  dbRowCount: number; // Actual rows queried from DB (for accurate offset calculation)
}> {
  const supabase = createClient();
  
  // Query newest first (DESC), then reverse to maintain ascending order
  // For older messages, we need messages BEFORE the ones we already have
  // Offset represents messages we've already loaded (newest ones)
  // So we skip the offset messages and get the next batch
  const query = supabase
    .from('messages')
    .select('id, role, content, parts, created_at, model, input_tokens, output_tokens, total_tokens, completion_time')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  const { data, error } = await query;
  
  if (error) {
    const userMessage = handleDbError(error, 'db/messages/getOlderMessages');
    logger.error('Error fetching older messages', error, { conversationId, limit, offset });
    const dbError = new Error(userMessage);
    throw dbError;
  }
  
  const filtered = (data || [])
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant');
  
  // If we got fewer rows than requested, there are no more messages in DB
  const hasMoreInDb = (data?.length || 0) >= limit;
  const actualDbRowCount = data?.length || 0; // Track actual rows queried from DB
  
  // Reverse to oldest-first for display (chronological order)
  const reversed = filtered.reverse();
  
  logger.debug('Older messages fetched', { 
    conversationId, 
    total: actualDbRowCount, 
    filtered: filtered.length,
    hasMoreInDb,
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
      role: msg.role as 'user' | 'assistant' | 'tool',
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
    hasMore: hasMoreInDb,
    dbRowCount: actualDbRowCount, // Return actual DB rows queried for accurate offset calculation
  };
}

