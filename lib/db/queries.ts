/**
 * Database Query Helper Functions
 * Abstracts Supabase queries for cleaner code
 */

import { createClient } from '@/lib/supabase/client';
import type { Conversation, Message } from '@/lib/types';

/**
 * Get user's linked OAuth providers from Supabase auth identities
 */
export async function getUserLinkedProviders(): Promise<string[]> {
  const supabase = createClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error('Error fetching user identities:', error);
      return [];
    }
    
    // user.identities contains all linked OAuth providers
    // Each identity has: { provider: 'google' | 'github' | 'twitter', ... }
    return user.identities?.map(identity => identity.provider) || [];
  } catch (error) {
    console.error('Error getting linked providers:', error);
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
    console.error('Error fetching conversations:', error);
    throw error;
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
    console.error('Error creating conversation:', error);
    throw error;
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
    console.error('Error updating conversation:', error);
    throw error;
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
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

/**
 * Get all messages for a conversation
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    throw error;
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
    console.error('Error creating message:', error);
    throw error;
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
    console.error('Error deleting all conversations:', error);
    throw error;
  }
}

