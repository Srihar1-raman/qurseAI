import { getMessagesServerSide, ensureConversationServerSide } from '@/lib/db/queries.server';
import { createClient } from '@/lib/supabase/server';
import { isValidConversationId, validateUrlSearchParams } from '@/lib/validation/chat-schema';
import { redirect } from 'next/navigation';
import { createScopedLogger } from '@/lib/utils/logger';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ConversationPageClient from './ConversationPageClient';
import type { User } from '@/lib/types';

const logger = createScopedLogger('conversation/page');

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; model?: string; mode?: string }>;
}

export default async function ConversationPage({ params, searchParams }: PageProps) {
  // Industry standard: Parallelize async params resolution (Next.js 15 best practice)
  // This reduces server-side page load time by resolving both promises concurrently
  const [{ id: conversationId }, urlParams, supabase] = await Promise.all([
    params,
    searchParams,
    createClient(),
  ]);

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
  let user: User | null = null;

  // Only check auth if we need to load messages (not a new conversation)
  // For new conversations, skip auth check (handled client-side via AuthContext)
  if (!conversationId.startsWith('temp-') && !validatedParams.message) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    // Map Supabase auth user to our User type
    if (authUser) {
      user = {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name,
        avatar_url: authUser.user_metadata?.avatar_url,
      };
    }

    // Only load messages if user is authenticated
    if (user && user.id) {
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
  }
  // For new conversations (with ?message=... param), skip auth check and message loading
  // Auth is handled client-side, conversation created in API route

  return (
    <ErrorBoundary>
      <ConversationPageClient
      conversationId={conversationId}
      initialMessages={initialMessages}
      initialHasMore={initialHasMore}
      initialDbRowCount={initialDbRowCount}
      hasInitialMessageParam={!!validatedParams.message}
        user={user}
    />
    </ErrorBoundary>
  );
}
