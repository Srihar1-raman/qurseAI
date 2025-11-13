import { getMessagesServerSide, checkConversationAccess } from '@/lib/db/queries.server';
import { createClient } from '@/lib/supabase/server';
import { getUserData } from '@/lib/supabase/auth-utils';
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

  // ============================================
  // ACCESS CONTROL: Check conversation access before rendering
  // ============================================

  // Check 1: Temp conversations should only be accessible with message param (new guest conversation)
  if (conversationId.startsWith('temp-')) {
    if (!validatedParams.message) {
      // Direct access to temp conversation URL without message param → redirect
      logger.warn('Direct access to temp conversation without message param', { conversationId });
      redirect('/');
    }
    // Has message param → Allow (new guest conversation flow)
    // Skip auth check and message loading (handled client-side, conversation created in API route)
  }
  // Check 2: Real conversations (not temp) - require access control (with or without message param)
  else {
    // Get user (required for access check)
    // Note: Reusing supabase client from line 24 to avoid creating multiple clients
    const { fullUser } = await getUserData(supabase);
    
    // Map Supabase auth user to our User type
    if (fullUser) {
      user = {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.user_metadata?.full_name || fullUser.user_metadata?.name,
        avatar_url: fullUser.user_metadata?.avatar_url,
      };
    }

    // Check 1: Guest users cannot access real conversations (even with message param)
    if (!user || !user.id) {
      logger.warn('Guest user accessing real conversation', { conversationId, hasMessageParam: !!validatedParams.message });
      redirect('/');
    }

    // Check 2 & 3: Conversation exists and belongs to user
    const accessCheck = await checkConversationAccess(conversationId, user.id, supabase);

    // Security: Fail-secure on database errors (redirect instead of allowing access)
    if (accessCheck.error) {
      logger.error('Database error during access check - failing secure', {
        conversationId,
        userId: user.id,
      });
      redirect('/');
    }

    // Security: If conversation exists but belongs to another user → redirect
    if (accessCheck.exists && !accessCheck.belongsToUser) {
      logger.warn('Unauthorized conversation access', {
        conversationId,
        userId: user.id,
        ownerId: accessCheck.conversation?.user_id,
        hasMessageParam: !!validatedParams.message,
      });
      redirect('/');
    }

    // Security: If conversation doesn't exist and no message param → redirect (invalid conversation ID)
    // Only allow "new conversation" flow if message param exists (indicates user is creating new conversation)
    if (!accessCheck.exists && !validatedParams.message) {
      logger.warn('Accessing non-existent conversation without message param', {
        conversationId,
        userId: user.id,
      });
      redirect('/');
    }

    // If conversation exists and belongs to user → load messages
    if (accessCheck.exists && accessCheck.belongsToUser) {
      // Existing conversation - load messages
      try {
        const { messages, hasMore, dbRowCount } = await getMessagesServerSide(conversationId, { limit: 50 });
        initialMessages = messages;
        initialHasMore = hasMore;
        initialDbRowCount = dbRowCount;
        logger.debug('Messages loaded', {
          conversationId,
          messageCount: initialMessages.length,
          hasMore: initialHasMore,
          dbRowCount: initialDbRowCount,
        });
      } catch (error) {
        // If message loading fails after access control passes, redirect (conversation exists but inaccessible)
        logger.error('Error loading messages after access control passes', error, { conversationId, userId: user.id });
        redirect('/');
      }
    }
    // If conversation doesn't exist BUT has message param → Allow (new conversation, will be created in API route)
    // Skip message loading (no messages yet)
  }

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
