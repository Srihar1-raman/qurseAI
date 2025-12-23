/**
 * Server-Side Message Queries
 * Message-related database operations
 */

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';
import { convertLegacyContentToParts, type MessageParts } from '@/lib/utils/message-parts-fallback';
import type { UIMessage } from 'ai';

const logger = createScopedLogger('db/messages.server');

// Service role client for public/shared data access (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase service credentials: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const serviceSupabase = createServiceClient(supabaseUrl, serviceKey);

/**
 * Save user message (server-side)
 * Returns true if message was saved, false if skipped (early return)
 * @param conversationId - Conversation ID
 * @param userMessage - User message with parts array
 * @param supabaseClient - Supabase client (required)
 * @returns true if saved, false if skipped
 */
export async function saveUserMessageServerSide(
  conversationId: string,
  userMessage: UIMessage,
  supabaseClient: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  if (!conversationId || !userMessage) {
    return false;
  }

  // Extract text from parts for content field (backward compatibility)
  const messageText = userMessage.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('') || '';

  if (!messageText.trim()) {
    return false;
  }

  // Save with parts array (new format) and content (backward compatibility)
  const { error: msgError } = await supabaseClient
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      parts: userMessage.parts || [{ type: 'text', text: messageText.trim() }],
      content: messageText.trim(), // Keep for backward compatibility
    });

  if (msgError) {
    logger.error('Failed to save user message', msgError, {
      conversationId,
      messageLength: messageText.length
    });
    throw new Error('Failed to save user message');
  }

  return true;
}

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
 * Get messages for a shared conversation (up to shared_message_count)
 * Uses service role client to bypass RLS for public access
 * @param conversationId - Conversation ID
 * @param messageCountLimit - Maximum number of messages to return (shared_message_count)
 * @returns Messages array (ordered ascending by created_at)
 */
export async function getSharedMessagesServerSide(
  conversationId: string,
  messageCountLimit: number
): Promise<Array<{ id: string; role: 'user' | 'assistant'; parts: MessageParts; model?: string; input_tokens?: number; output_tokens?: number; total_tokens?: number; completion_time?: number; created_at: string }>> {
  // Use service role client to bypass RLS for public shared conversations
  // Query messages in ascending order, limit to messageCountLimit
  const { data, error } = await serviceSupabase
    .from('messages')
    .select('id, role, content, parts, created_at, model, input_tokens, output_tokens, total_tokens, completion_time')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(messageCountLimit);

  if (error) {
    const userMessage = handleDbError(error, 'db/messages.server/getSharedMessagesServerSide');
    logger.error('Error fetching shared messages', error, { conversationId, messageCountLimit });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  const filtered = (data || [])
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant');

  const messages = filtered.map((msg) => {
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
      created_at: msg.created_at, // Preserve original timestamp
    };
  });

  return messages;
}


