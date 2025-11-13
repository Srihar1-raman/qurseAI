/**
 * Database Query Helper Functions
 * Abstracts Supabase queries for cleaner code
 * 
 * NOTE: These functions use the browser client and are meant for client-side operations.
 * For server-side operations (API routes), import from @/lib/supabase/server directly.
 */

import { createClient } from '@/lib/supabase/client';
import type { Conversation, Message } from '@/lib/types';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';

const logger = createScopedLogger('db/queries');

/**
 * Get user's linked OAuth providers from Supabase auth identities
 */
export async function getUserLinkedProviders(): Promise<string[]> {
  const supabase = createClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      logger.error('Error fetching user identities', error);
      return [];
    }
    
    // user.identities contains all linked OAuth providers
    // Each identity has: { provider: 'google' | 'github' | 'twitter', ... }
    return user.identities?.map(identity => identity.provider) || [];
  } catch (error) {
    logger.error('Error getting linked providers', error);
    return [];
  }
}

/**
 * Get conversations for a user with optional pagination
 * @param userId - User ID
 * @param options - Pagination options (limit, offset)
 * @returns Array of conversations (default limit: 50)
 */
export async function getConversations(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ 
  conversations: Conversation[];
  hasMore: boolean;
}> {
  const supabase = createClient();
  
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  
  let query = supabase
    .from('conversations')
    .select('*, message_count:messages(count)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  
  // Use range() for pagination (handles both offset and limit)
  // When offset = 0, range(0, limit - 1) = first 'limit' rows
  if (offset > 0) {
    query = query.range(offset, offset + limit - 1);
  } else {
    query = query.range(0, limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    const userMessage = handleDbError(error, 'db/queries/getConversations');
    logger.error('Error fetching conversations', error, { userId, limit, offset });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  // If we got fewer rows than requested, there are no more conversations in DB
  const hasMore = (data?.length || 0) >= limit;

  const conversations = (data || []).map(conv => ({
    id: conv.id,
    title: conv.title,
    updated_at: conv.updated_at,
    created_at: conv.created_at,
    message_count: conv.message_count?.[0]?.count || 0,
  }));

  return {
    conversations,
    hasMore,
  };
}

/**
 * Get total count of conversations for a user
 * Fast COUNT query - no data transfer, just count
 * @param userId - User ID
 * @returns Total number of conversations
 */
export async function getConversationCount(userId: string): Promise<number> {
  const supabase = createClient();
  
  const { count, error } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    const userMessage = handleDbError(error, 'db/queries/getConversationCount');
    logger.error('Error fetching conversation count', error, { userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  return count || 0;
}

/**
 * Search conversations by title (server-side search)
 * Searches entire database, not just loaded conversations
 * @param userId - User ID
 * @param searchQuery - Search term (will be used with ILIKE)
 * @returns Array of matching conversations (max 1000)
 */
export async function searchConversations(
  userId: string,
  searchQuery: string
): Promise<Conversation[]> {
  const supabase = createClient();
  
  // Sanitize search query (trim, escape special characters for ILIKE)
  const sanitizedQuery = searchQuery.trim();
  if (!sanitizedQuery) {
    return [];
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, updated_at, created_at, user_id')
    .eq('user_id', userId)
    .ilike('title', `%${sanitizedQuery}%`)
    .order('updated_at', { ascending: false })
    .limit(1000);

  if (error) {
    const userMessage = handleDbError(error, 'db/queries/searchConversations');
    logger.error('Error searching conversations', error, { userId, searchQuery: sanitizedQuery });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  // Map to Conversation type (no message_count needed for search results)
  const conversations = (data || []).map(conv => ({
    id: conv.id,
    title: conv.title,
    updated_at: conv.updated_at,
    created_at: conv.created_at,
    message_count: 0, // Not needed for search results, set to 0
  }));

  logger.debug('Search results', { userId, query: sanitizedQuery, count: conversations.length });

  return conversations;
}

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
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; reasoning?: string }>;
  hasMore: boolean;
  dbRowCount: number; // Actual rows queried from DB (for accurate offset calculation)
}> {
  const supabase = createClient();
  
  // Query newest first (DESC), then reverse to maintain ascending order
  // For older messages, we need messages BEFORE the ones we already have
  // Offset represents messages we've already loaded (newest ones)
  // So we skip the offset messages and get the next batch
  let query = supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  const { data, error } = await query;
  
  if (error) {
    const userMessage = handleDbError(error, 'db/queries/getOlderMessages');
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
    // Extract reasoning from content if it exists (delimiter: |||REASONING|||)
    let content = msg.content;
    let reasoning: string | undefined;
    
    if (content.includes('|||REASONING|||')) {
      const parts = content.split('|||REASONING|||');
      content = parts[0];
      reasoning = parts[1];
    }
    
    return {
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content,
      reasoning,
    };
  });

  return {
    messages,
    hasMore: hasMoreInDb,
    dbRowCount: actualDbRowCount, // Return actual DB rows queried for accurate offset calculation
  };
}

/**
 * Create a new conversation
 */
export async function createConversation(
  userId: string,
  title: string = 'New Chat'
): Promise<Conversation> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      title,
    })
    .select()
    .single();

  if (error) {
    const userMessage = handleDbError(error, 'db/queries/createConversation');
    logger.error('Error creating conversation', error, { userId, title });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  return {
    id: data.id,
    title: data.title,
    updated_at: data.updated_at,
    created_at: data.created_at,
    message_count: 0,
  };
}

/**
 * Update conversation title
 */
export async function updateConversation(
  conversationId: string,
  updates: { title?: string }
): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', conversationId);

  if (error) {
    const userMessage = handleDbError(error, 'db/queries/updateConversation');
    logger.error('Error updating conversation', error, { conversationId, updates });
    const dbError = new Error(userMessage);
    throw dbError;
  }
}

/**
 * Delete a conversation (cascades to messages)
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  if (error) {
    const userMessage = handleDbError(error, 'db/queries/deleteConversation');
    logger.error('Error deleting conversation', error, { conversationId });
    const dbError = new Error(userMessage);
    throw dbError;
  }
}

/**
 * Get all messages for a conversation (client-side)
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    const userMessage = handleDbError(error, 'db/queries/getMessages');
    logger.error('Error fetching messages', error, { conversationId });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  return data.map(msg => ({
    id: msg.id,
    text: msg.content,
    content: msg.content,
    isUser: msg.role === 'user',
    role: msg.role as 'user' | 'assistant' | 'system',
    timestamp: msg.created_at,
    created_at: msg.created_at,
  }));
}


/**
 * Create a new message
 */
export async function createMessage(
  conversationId: string,
  content: string,
  role: 'user' | 'assistant' | 'system'
): Promise<Message> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      content,
      role,
    })
    .select()
    .single();

  if (error) {
    const userMessage = handleDbError(error, 'db/queries/createMessage');
    logger.error('Error creating message', error, { conversationId, role });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  return {
    id: data.id,
    text: data.content,
    content: data.content,
    isUser: data.role === 'user',
    role: data.role as 'user' | 'assistant' | 'system',
    timestamp: data.created_at,
    created_at: data.created_at,
  };
}

/**
 * Delete all conversations for a user
 */
export async function deleteAllConversations(userId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('user_id', userId);

  if (error) {
    const userMessage = handleDbError(error, 'db/queries/deleteAllConversations');
    logger.error('Error deleting all conversations', error, { userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }
}

/**
 * Ensure a conversation exists in the database
 * Creates the conversation if it doesn't exist, with the provided ID
 * This is idempotent and handles race conditions gracefully
 */
export async function ensureConversation(
  conversationId: string,
  userId: string,
  title: string
): Promise<void> {
  const supabase = createClient();
  
  try {
    // First check if conversation already exists
    const { data: existing, error: checkError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .maybeSingle();
    
    if (checkError) {
      const userMessage = handleDbError(checkError, 'db/queries/ensureConversation');
      logger.error('Error checking conversation', checkError, { conversationId, userId });
      const dbError = new Error(userMessage);
      throw dbError;
    }
    
    // If exists, verify ownership
    if (existing) {
      if (existing.user_id !== userId) {
        throw new Error('Conversation belongs to another user');
      }
      return; // Already exists and ownership verified
    }
    
    // Create new conversation with explicit ID
    const { error: insertError } = await supabase
      .from('conversations')
      .insert({
        id: conversationId,
        user_id: userId,
        title,
      });
    
    if (insertError) {
      // Handle race condition - another request may have created it
      if (insertError.code === '23505') { // Duplicate key
        // Verify ownership
        const { data: verify } = await supabase
          .from('conversations')
          .select('user_id')
          .eq('id', conversationId)
          .maybeSingle();
        
        if (verify && verify.user_id === userId) {
          return; // Created by another request, ownership verified
        }
        throw new Error('Conversation ID conflict');
      }
      throw insertError;
    }
  } catch (error) {
    const userMessage = handleDbError(error, 'db/queries/ensureConversation');
    logger.error('Error ensuring conversation', error, { conversationId, userId, title });
    const dbError = new Error(userMessage);
    throw dbError;
  }
}

