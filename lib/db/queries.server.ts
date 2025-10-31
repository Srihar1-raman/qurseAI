/**
 * Server-Side Database Queries
 * ONLY for use in Server Components and Server Actions
 * Uses Supabase server client
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Get all messages for a conversation (server-side)
 */
export async function getMessagesServerSide(
  conversationId: string
): Promise<Array<{ id: string; role: 'user' | 'assistant'; content: string }>> {
  const supabase = await createClient();

  console.log('🔍 QUERY - Fetching messages for conversation:', conversationId);

  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ QUERY - Error fetching messages:', error);
    throw error;
  }

  console.log('🔍 QUERY - Raw data from DB:', data?.length, 'messages');
  console.log('🔍 QUERY - Raw data:', data);

  const filtered = (data || [])
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant');
  
  console.log('🔍 QUERY - After filtering:', filtered.length, 'messages');

  return filtered.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));
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
      console.error('Error checking conversation:', checkError);
      throw checkError;
    }

    if (existing) {
      if (existing.user_id !== userId) {
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
          return;
        }
        throw new Error('Conversation ID conflict');
      }
      throw insertError;
    }
  } catch (error) {
    console.error('Error ensuring conversation:', error);
    throw error;
  }
}

