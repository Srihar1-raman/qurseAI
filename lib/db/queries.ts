/**
 * Database Query Helper Functions
 * Abstracts Supabase queries for cleaner code
 * 
 * NOTE: These functions use the browser client and are meant for client-side operations.
 * For server-side operations (API routes), import from @/lib/supabase/server directly.
 */

import { createClient } from '@/lib/supabase/client';
import type { Conversation, Message, UserPreferences } from '@/lib/types';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';
import { convertLegacyContentToParts, type MessageParts } from '@/lib/utils/message-parts-fallback';

const logger = createScopedLogger('db/queries');

/**
 * Get user's linked OAuth providers from Supabase auth identities
 * Includes retry logic to handle race conditions when session is being established
 */
export async function getUserLinkedProviders(retryCount = 0): Promise<string[]> {
  const supabase = createClient();
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 500; // 500ms delay between retries
  
  try {
    // Check if we have a valid session first (avoid unnecessary API calls)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      // No valid session - return empty array (not an error, user might be guest)
      return [];
    }
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Check if it's a retryable error (network/auth errors that might resolve on retry)
      const isRetryableError = 
        error.name === 'AuthRetryableFetchError' ||
        error.name === 'AuthApiError' ||
        (error instanceof Error && (
          error.message.includes('Load failed') ||
          error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('Failed to fetch')
        ));
      
      // Retry on network/auth errors (session might not be fully ready)
      if (retryCount < MAX_RETRIES && isRetryableError) {
        logger.debug(`Retrying getUserLinkedProviders (attempt ${retryCount + 1}/${MAX_RETRIES})`, { 
          errorName: error.name,
          errorMessage: error.message 
        });
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return getUserLinkedProviders(retryCount + 1);
      }
      
      // Don't log as error if it's just a missing user (guest mode) or session error
      const isSessionError = 
        error.message.includes('JWT') ||
        error.message.includes('session') ||
        error.message.includes('token') ||
        error.name === 'AuthSessionMissingError';
      
      if (isSessionError) {
        logger.debug('No valid session for getUserLinkedProviders', { error: error.message });
      } else {
        logger.error('Error fetching user identities', error);
      }
      return [];
    }
    
    if (!user) {
      // No user (guest mode) - not an error
      return [];
    }
    
    // user.identities contains all linked OAuth providers
    // Each identity has: { provider: 'google' | 'github' | 'twitter', ... }
    return user.identities?.map(identity => identity.provider) || [];
  } catch (error) {
    // Check if it's a retryable network error
    const isRetryableNetworkError = 
      error instanceof Error && (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('Load failed') ||
        error.name === 'TypeError' // "Load failed" often throws TypeError
      );
    
    // Retry on network errors
    if (retryCount < MAX_RETRIES && isRetryableNetworkError) {
      logger.debug(`Retrying getUserLinkedProviders after error (attempt ${retryCount + 1}/${MAX_RETRIES})`, {
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return getUserLinkedProviders(retryCount + 1);
    }
    
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
  let query = supabase
    .from('messages')
    .select('id, role, content, parts, created_at, model, input_tokens, output_tokens, total_tokens, completion_time')
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
    .select('id, role, content, created_at, model, input_tokens, output_tokens, total_tokens, completion_time')
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
    role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
    timestamp: msg.created_at,
    model: msg.model ?? undefined,
    input_tokens: msg.input_tokens ?? undefined,
    output_tokens: msg.output_tokens ?? undefined,
    total_tokens: msg.total_tokens ?? undefined,
    completion_time: msg.completion_time ?? undefined,
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

/**
 * Get user preferences (client-side)
 * Returns default preferences if user has none
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    const userMessage = handleDbError(error, 'db/queries/getUserPreferences');
    logger.error('Error fetching user preferences', error, { userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  // Return defaults if no preferences exist
  if (!data) {
    return {
      user_id: userId,
      theme: 'auto',
      language: 'English',
      auto_save_conversations: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return {
    user_id: data.user_id,
    theme: data.theme as 'light' | 'dark' | 'auto',
    language: data.language,
    auto_save_conversations: data.auto_save_conversations,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Update user preferences (client-side)
 * Creates preferences if they don't exist
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPreferences> {
  const supabase = createClient();

  // Check if preferences exist
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Update existing preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .update(preferences)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      const userMessage = handleDbError(error, 'db/queries/updateUserPreferences');
      logger.error('Error updating user preferences', error, { userId });
      const dbError = new Error(userMessage);
      throw dbError;
    }

    return {
      user_id: data.user_id,
      theme: data.theme as 'light' | 'dark' | 'auto',
      language: data.language,
      auto_save_conversations: data.auto_save_conversations,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } else {
    // Create new preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .insert({
        user_id: userId,
        theme: preferences.theme ?? 'auto',
        language: preferences.language ?? 'English',
        auto_save_conversations: preferences.auto_save_conversations ?? true,
      })
      .select()
      .single();

    if (error) {
      const userMessage = handleDbError(error, 'db/queries/updateUserPreferences');
      logger.error('Error creating user preferences', error, { userId });
      const dbError = new Error(userMessage);
      throw dbError;
    }

    return {
      user_id: data.user_id,
      theme: data.theme as 'light' | 'dark' | 'auto',
      language: data.language,
      auto_save_conversations: data.auto_save_conversations,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }
}

/**
 * Update user profile (client-side)
 */
export async function updateUserProfile(
  userId: string,
  updates: { name?: string; avatar_url?: string }
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) {
    const userMessage = handleDbError(error, 'db/queries/updateUserProfile');
    logger.error('Error updating user profile', error, { userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }
}

