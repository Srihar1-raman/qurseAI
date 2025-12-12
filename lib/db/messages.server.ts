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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase service credentials: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const serviceSupabase = createServiceClient(supabaseUrl, serviceKey);

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
 * 
 * @deprecated Use checkRateLimit() from @/lib/services/rate-limiting instead.
 * This function is kept for backward compatibility during migration period.
 * Will be removed after monitoring period (1-2 weeks).
 * 
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

type GuestMessagePayload = {
  conversationId: string;
  message: UIMessage;
  role: 'user' | 'assistant' | 'system' | 'tool';
  sessionHash: string;
};

function extractMessageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('') || ''
  );
}

export async function ensureGuestConversation(
  sessionHash: string,
  title: string,
  conversationId?: string
): Promise<string> {
  const supabase = serviceSupabase;

  // If conversationId provided, validate it belongs to this session_hash
  if (conversationId && !conversationId.startsWith('temp-')) {
    // First check if conversation exists and belongs to this session
    const { data: existing, error } = await supabase
      .from('guest_conversations')
      .select('id, session_hash')
      .eq('id', conversationId)
      .eq('session_hash', sessionHash)
      .maybeSingle();

    if (error) {
      logger.error('Error checking guest conversation', error, { conversationId, sessionHash });
      throw error;
    }

    if (existing?.id) {
      // Conversation exists and belongs to this session - return it
      return existing.id;
    }

    // Conversation doesn't exist or doesn't belong to this session
    // Check if it exists with different session_hash (security check)
    const { data: existsWithOtherSession, error: checkError } = await supabase
      .from('guest_conversations')
      .select('id, session_hash')
      .eq('id', conversationId)
      .maybeSingle();

    if (checkError) {
      logger.error('Error checking guest conversation existence', checkError, { conversationId });
      throw checkError;
    }

    if (existsWithOtherSession?.id) {
      // Conversation exists but belongs to another session - security violation
      logger.warn('Attempted to access guest conversation from different session', {
        conversationId,
        requestedSessionHash: sessionHash,
        actualSessionHash: existsWithOtherSession.session_hash,
      });
      throw new Error('Conversation belongs to another session');
    }

    // Conversation doesn't exist - create new one with the provided ID
    const { data: inserted, error: insertError } = await supabase
      .from('guest_conversations')
      .insert({
        id: conversationId,
        session_hash: sessionHash,
        title: title || 'New Chat',
      })
      .select('id')
      .single();

    if (insertError) {
      // Handle race condition (conversation created between check and insert)
      if (insertError.code === '23505') {
        // ID already exists - verify ownership (race condition)
        const { data: verify } = await supabase
          .from('guest_conversations')
          .select('id')
          .eq('id', conversationId)
          .eq('session_hash', sessionHash)
          .maybeSingle();
        
        if (verify?.id) {
          logger.debug('Guest conversation created by concurrent request', { conversationId, sessionHash });
          return verify.id;
        }
        // Race condition: conversation created by another session
        throw new Error('Conversation ID conflict');
      }
      throw insertError;
    }

    return inserted.id;
  }

  // No conversationId provided - create new conversation (NEW CHAT)
  // This is correct behavior - don't change this
  const { data: created, error: createError } = await supabase
    .from('guest_conversations')
    .insert({
      session_hash: sessionHash,
      title: title || 'New Chat',
    })
    .select('id')
    .single();

  if (createError) {
    logger.error('Failed to create guest conversation', createError, { sessionHash });
    throw createError;
  }

  return created.id;
}

/**
 * Get guest messages for a conversation (server-side)
 * Mirror of getMessagesServerSide for auth users
 * Uses service-role client (required for guest tables)
 */
export async function getGuestMessagesServerSide(
  conversationId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ 
  messages: Array<{ 
    id: string; 
    role: 'user' | 'assistant'; 
    parts: MessageParts; 
    model?: string; 
    input_tokens?: number; 
    output_tokens?: number; 
    total_tokens?: number; 
    completion_time?: number;
  }>;
  hasMore: boolean;
  dbRowCount: number;
}> {
  const supabase = serviceSupabase;
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let query = supabase
    .from('guest_messages')
    .select('id, role, content, parts, created_at, model, input_tokens, output_tokens, total_tokens, completion_time')
    .eq('guest_conversation_id', conversationId)
    .order('created_at', { ascending: false });
  
  if (offset > 0) {
    query = query.range(offset, offset + limit - 1);
  } else {
    query = query.range(0, limit - 1);
  }
  
  const { data, error } = await query;
  
  if (error) {
    const userMessage = handleDbError(error, 'db/messages.server/getGuestMessagesServerSide');
    logger.error('Error fetching guest messages', error, { conversationId, limit, offset });
    const dbError = new Error(userMessage);
    throw dbError;
  }
  
  const filtered = (data || []).filter((msg) => msg.role === 'user' || msg.role === 'assistant');
  const hasMore = (data?.length || 0) >= limit;
  const actualDbRowCount = data?.length || 0;
  const reversed = filtered.reverse();
  
  logger.debug('Guest messages fetched', { 
    conversationId, 
    total: actualDbRowCount, 
    filtered: filtered.length,
    hasMore,
    limit,
    offset
  });
  
  const messages = reversed.map((msg) => {
    let parts: MessageParts = [];
    
    if (msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0) {
      parts = msg.parts as MessageParts;
    } else {
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
    dbRowCount: actualDbRowCount,
  };
}

export async function saveGuestMessage(payload: GuestMessagePayload): Promise<void> {
  const { conversationId, message, role, sessionHash } = payload;
  if (!conversationId || conversationId.startsWith('temp-')) return;

  const supabase = serviceSupabase;

  const contentText = extractMessageText(message).trim();
  const parts = message.parts;

  if (!parts || parts.length === 0) {
    logger.warn('Skipping guest message save due to empty parts', { conversationId, role });
    return;
  }

  const metadata = (message as UIMessage & { metadata?: Record<string, unknown> }).metadata ?? {};
  const inputTokens = (metadata as { inputTokens?: number | null }).inputTokens ?? null;
  const outputTokens = (metadata as { outputTokens?: number | null }).outputTokens ?? null;
  const totalTokens = (metadata as { totalTokens?: number | null }).totalTokens ?? null;
  const completionTime = (metadata as { completionTime?: number | null }).completionTime ?? null;
  const model = (metadata as { model?: string | null }).model ?? null;

  const { error } = await supabase.from('guest_messages').insert({
    guest_conversation_id: conversationId,
    role,
    parts,
    content: contentText || null,
    model: model || null,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    completion_time: completionTime,
  });

  if (error) {
    logger.error('Failed to save guest message', error, { conversationId, sessionHash, role });
    throw error;
  }

  logger.debug('Guest message saved', {
    conversationId,
    sessionHash,
    role,
  });
}

