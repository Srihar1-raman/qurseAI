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
 * Get all conversations for a user
 */
export async function getConversations(userId: string): Promise<Conversation[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('conversations')
    .select('*, message_count:messages(count)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    const userMessage = handleDbError(error, 'db/queries/getConversations');
    logger.error('Error fetching conversations', error, { userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  return data.map(conv => ({
    id: conv.id,
    title: conv.title,
    updated_at: conv.updated_at,
    created_at: conv.created_at,
    message_count: conv.message_count?.[0]?.count || 0,
  }));
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

