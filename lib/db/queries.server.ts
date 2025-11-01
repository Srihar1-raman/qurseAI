/**
 * Server-Side Database Queries
 * ONLY for use in Server Components and Server Actions
 * Uses Supabase server client
 */

import { createClient } from '@/lib/supabase/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';

const logger = createScopedLogger('db/queries.server');

/**
 * Get all messages for a conversation (server-side)
 */
export async function getMessagesServerSide(
  conversationId: string
): Promise<Array<{ id: string; role: 'user' | 'assistant'; content: string; reasoning?: string }>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    const userMessage = handleDbError(error, 'db/queries.server/getMessagesServerSide');
    logger.error('Error fetching messages', error, { conversationId });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  const filtered = (data || [])
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant');
  
  logger.debug('Messages fetched', { 
    conversationId, 
    total: data?.length || 0, 
    filtered: filtered.length 
  });

  return filtered.map((msg) => {
    // Extract reasoning from content if it exists (delimiter: |||REASONING|||)
    let content = msg.content;
    let reasoning: string | undefined;
    
    if (content.includes('|||REASONING|||')) {
      const parts = content.split('|||REASONING|||');
      content = parts[0];
      const reasoningRaw = parts[1];
      
      // Try to parse if it's JSON, otherwise use as-is
      try {
        const parsed = JSON.parse(reasoningRaw);
        reasoning = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
      } catch {
        reasoning = reasoningRaw;
      }
    }
    
    return {
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: content,
      reasoning: reasoning,
    };
  });
}

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
      const userMessage = handleDbError(checkError, 'db/queries.server/ensureConversationServerSide');
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
      const userMessage = handleDbError(insertError, 'db/queries.server/ensureConversationServerSide');
      logger.error('Error creating conversation', insertError, { conversationId, userId });
      const dbError = new Error(userMessage);
      throw dbError;
    }
  } catch (error) {
    const userMessage = handleDbError(error, 'db/queries.server/ensureConversationServerSide');
    logger.error('Error ensuring conversation', error, { conversationId, userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }
}

