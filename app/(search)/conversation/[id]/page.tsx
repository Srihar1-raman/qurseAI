import dynamic from 'next/dynamic';
import { getMessagesServerSide, ensureConversationServerSide } from '@/lib/db/queries.server';
import { createClient } from '@/lib/supabase/server';
import { isValidConversationId, validateUrlSearchParams, safeDecodeURIComponent } from '@/lib/validation/chat-schema';
import { redirect } from 'next/navigation';
import { createScopedLogger } from '@/lib/utils/logger';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load ConversationClient to code split AI SDK
// AI SDK code is only loaded when user navigates to a conversation page
// Note: ConversationClient is a client component ('use client'), so it won't SSR anyway
const ConversationClient = dynamic(
  () => import('@/components/conversation/ConversationClient').then(mod => ({ default: mod.ConversationClient })),
  {
    loading: () => (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        color: 'var(--color-text)'
      }}>
        Loading conversation...
      </div>
    ),
  }
);

const logger = createScopedLogger('conversation/page');

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; model?: string; mode?: string }>;
}

export default async function ConversationPage({ params, searchParams }: PageProps) {
  const { id: conversationId } = await params;
  const urlParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Validate conversation ID format
  if (!isValidConversationId(conversationId)) {
    logger.warn('Invalid conversation ID format', { conversationId });
    redirect('/');
  }

  // Validate URL search parameters
  const searchParamsValidation = validateUrlSearchParams(urlParams);
  if (!searchParamsValidation.success) {
    logger.warn('Invalid URL search parameters', { errors: searchParamsValidation.errors?.issues });
    // Continue with valid params only, ignore invalid ones
  }

  const validatedParams = searchParamsValidation.data || {};

  let initialMessages: Array<{ id: string; role: 'user' | 'assistant'; content: string; reasoning?: string }> = [];
  let initialHasMore = false;
  let initialDbRowCount = 0;

  // Only load messages if:
  // 1. Not a temp conversation
  // 2. No initial message param (not a brand new conversation)
  // 3. User is authenticated
  if (!conversationId.startsWith('temp-') && !validatedParams.message && user) {
    try {
      // Ensure conversation exists (in case of direct URL access)
      await ensureConversationServerSide(conversationId, user.id, 'Chat');
      
      // Load messages from database (last 50 messages)
      const { messages, hasMore, dbRowCount } = await getMessagesServerSide(conversationId, { limit: 50 });
      initialMessages = messages;
      initialHasMore = hasMore;
      initialDbRowCount = dbRowCount;
      logger.debug('Messages loaded', { 
        conversationId, 
        messageCount: initialMessages.length,
        hasMore: initialHasMore,
        dbRowCount: initialDbRowCount
      });
    } catch (error) {
      logger.error('Error loading conversation', error, { conversationId });
      // Continue with empty messages - user can still chat
    }
  }

  // If there's an initial message param and user exists, ensure conversation exists
  if (validatedParams.message && user && !conversationId.startsWith('temp-')) {
    try {
      // Safely decode URL-encoded message
      const messageText = safeDecodeURIComponent(validatedParams.message);
      if (!messageText) {
        logger.warn('Failed to decode message parameter', { conversationId });
      } else {
      const title = messageText.slice(0, 50) + (messageText.length > 50 ? '...' : '');
      await ensureConversationServerSide(conversationId, user.id, title);
      }
    } catch (error) {
      logger.error('Error ensuring conversation', error, { conversationId });
    }
  }

  return (
    <ErrorBoundary>
    <ConversationClient
      conversationId={conversationId}
      initialMessages={initialMessages}
      initialHasMore={initialHasMore}
      initialDbRowCount={initialDbRowCount}
      hasInitialMessageParam={!!validatedParams.message}
    />
    </ErrorBoundary>
  );
}
