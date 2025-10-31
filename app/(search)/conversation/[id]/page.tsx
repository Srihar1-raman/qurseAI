import { ConversationClient } from '@/components/conversation/ConversationClient';
import { getMessagesServerSide, ensureConversationServerSide } from '@/lib/db/queries.server';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; model?: string; mode?: string }>;
}

export default async function ConversationPage({ params, searchParams }: PageProps) {
  const { id: conversationId } = await params;
  const urlParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  console.log('🔍 SERVER - conversationId:', conversationId);
  console.log('🔍 SERVER - urlParams.message:', urlParams.message);
  console.log('🔍 SERVER - user:', user?.id);

  let initialMessages: Array<{ id: string; role: 'user' | 'assistant'; content: string }> = [];

  // Only load messages if:
  // 1. Not a temp conversation
  // 2. No initial message param (not a brand new conversation)
  // 3. User is authenticated
  if (!conversationId.startsWith('temp-') && !urlParams.message && user) {
    try {
      console.log('🔍 SERVER - Ensuring conversation exists...');
      // Ensure conversation exists (in case of direct URL access)
      await ensureConversationServerSide(conversationId, user.id, 'Chat');
      
      console.log('🔍 SERVER - Loading messages from DB...');
      // Load messages from database
      initialMessages = await getMessagesServerSide(conversationId);
      console.log('🔍 SERVER - Loaded messages count:', initialMessages.length);
      console.log('🔍 SERVER - Messages:', initialMessages);
    } catch (error) {
      console.error('❌ SERVER - Error loading conversation:', error);
      // Continue with empty messages - user can still chat
    }
  } else {
    console.log('🔍 SERVER - Skipping message load:', {
      isTemp: conversationId.startsWith('temp-'),
      hasUrlMessage: !!urlParams.message,
      hasUser: !!user
    });
  }

  // If there's an initial message param and user exists, ensure conversation exists
  if (urlParams.message && user && !conversationId.startsWith('temp-')) {
    try {
      const messageText = decodeURIComponent(urlParams.message);
      const title = messageText.slice(0, 50) + (messageText.length > 50 ? '...' : '');
      await ensureConversationServerSide(conversationId, user.id, title);
    } catch (error) {
      console.error('Error ensuring conversation:', error);
    }
  }

  return (
    <ConversationClient
      conversationId={conversationId}
      initialMessages={initialMessages}
      hasInitialMessageParam={!!urlParams.message}
    />
  );
}
