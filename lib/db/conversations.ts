/**
 * Client-Side Conversation Queries
 * Conversation-related database operations for client-side use
 */

import { createClient } from '@/lib/supabase/client';
import type { Conversation } from '@/lib/types';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';

const logger = createScopedLogger('db/conversations');

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
    .order('pinned', { ascending: false })
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
    const userMessage = handleDbError(error, 'db/conversations/getConversations');
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
    pinned: conv.pinned || false,
    share_token: conv.share_token || null,
    is_shared: conv.is_shared || false,
  }));

  return {
    conversations,
    hasMore,
  };
}

/**
 * Get guest conversations (client-side)
 * Calls API route which handles server-side session_hash extraction
 * Mirror of getConversations for auth users
 */
export async function getGuestConversations(
  options?: { limit?: number; offset?: number }
): Promise<{ 
  conversations: Conversation[];
  hasMore: boolean;
}> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const response = await fetch(
    `/api/guest/conversations?limit=${limit}&offset=${offset}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch guest conversations' }));
    logger.error('Error fetching guest conversations', { status: response.status, error });
    throw new Error(error.error || 'Failed to fetch guest conversations');
  }

  const { conversations, hasMore } = await response.json();

  return {
    conversations: conversations || [],
    hasMore: hasMore || false,
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
    const userMessage = handleDbError(error, 'db/conversations/getConversationCount');
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
    .select('id, title, updated_at, created_at, user_id, pinned, share_token, is_shared')
    .eq('user_id', userId)
    .ilike('title', `%${sanitizedQuery}%`)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(1000);

  if (error) {
    const userMessage = handleDbError(error, 'db/conversations/searchConversations');
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
    pinned: conv.pinned || false,
    share_token: conv.share_token || null,
    is_shared: conv.is_shared || false,
  }));

  logger.debug('Search results', { userId, query: sanitizedQuery, count: conversations.length });

  return conversations;
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
    const userMessage = handleDbError(error, 'db/conversations/createConversation');
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
    const userMessage = handleDbError(error, 'db/conversations/updateConversation');
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
    const userMessage = handleDbError(error, 'db/conversations/deleteConversation');
    logger.error('Error deleting conversation', error, { conversationId });
    const dbError = new Error(userMessage);
    throw dbError;
  }
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
    const userMessage = handleDbError(error, 'db/conversations/deleteAllConversations');
    logger.error('Error deleting all conversations', error, { userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }
}

