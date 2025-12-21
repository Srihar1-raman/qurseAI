/**
 * Server-Side Guest Message Queries
 * Guest message-related database operations
 * Uses service-role client (required for guest tables)
 */

import 'server-only';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';
import { convertLegacyContentToParts, type MessageParts } from '@/lib/utils/message-parts-fallback';
import type { UIMessage } from 'ai';

const logger = createScopedLogger('db/guest-messages.server');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase service credentials: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const serviceSupabase = createServiceClient(supabaseUrl, serviceKey);

type GuestMessagePayload = {
  conversationId: string;
  message: UIMessage;
  role: 'user' | 'assistant' | 'system' | 'tool';
  sessionHash: string;
};

/**
 * Extract text content from a UIMessage
 */
function extractMessageText(message: UIMessage): string {
  return (
    message.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('') || ''
  );
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
    const userMessage = handleDbError(error, 'db/guest-messages.server/getGuestMessagesServerSide');
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

/**
 * Save guest message (server-side)
 */
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

