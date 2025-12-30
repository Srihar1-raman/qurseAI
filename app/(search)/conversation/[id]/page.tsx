import type { Metadata } from 'next';
import { getConversationTitleById, getGuestConversationTitleById } from '@/lib/db/queries.server';
import { getMessagesServerSide, checkConversationAccess } from '@/lib/db/queries.server';
import { getGuestMessagesServerSide } from '@/lib/db/guest-messages.server';
import { checkGuestConversationAccess } from '@/lib/db/guest-conversations.server';
import { createClient } from '@/lib/supabase/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import { isValidConversationId, validateUrlSearchParams } from '@/lib/validation/chat-schema';
import { redirect } from 'next/navigation';
import { createScopedLogger } from '@/lib/utils/logger';
import { cookies } from 'next/headers';
import { isValidUUID } from '@/lib/utils/session';
import { hmacSessionId } from '@/lib/utils/session-hash';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ConversationPageClient from './ConversationPageClient';
import type { User } from '@/lib/types';
import type { UIMessagePart } from 'ai';

const logger = createScopedLogger('conversation/page');

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; model?: string; mode?: string }>;
}

// Generate dynamic metadata for conversation pages
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: conversationId } = await params;

  // Default metadata (fallback)
  const defaultMetadata: Metadata = {
    title: 'Qurse',
    description: 'AI Chat Platform for the fastest',
  };

  try {
    // Check if user is authenticated
    const { fullUser } = await getUserData();
    let title: string | null = null;

    if (fullUser?.id) {
      // Auth user: fetch conversation title
      title = await getConversationTitleById(conversationId, fullUser.id);
    } else {
      // Guest user: fetch conversation title using session_hash
      const cookieStore = await cookies();
      const sessionIdCookie = cookieStore.get('session_id');
      const sessionId = sessionIdCookie?.value || null;

      if (sessionId && isValidUUID(sessionId)) {
        const sessionHash = hmacSessionId(sessionId);
        title = await getGuestConversationTitleById(conversationId, sessionHash);
      }
    }

    // If title exists and is not empty/default, use it
    if (title && title.trim() && title !== 'New Chat') {
      // Truncate to 60 chars for tab display
      const truncatedTitle = title.length > 60
        ? title.slice(0, 57) + '...'
        : title;

      return {
        title: `${truncatedTitle} | Qurse`,
        description: 'AI Chat Platform for the fastest',
      };
    }

    // No title or default title → just "Qurse"
    return defaultMetadata;
  } catch (error) {
    logger.error('Error generating conversation metadata', error, { conversationId });
    return defaultMetadata;
  }
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

  let initialMessages: Array<{ id: string; role: 'user' | 'assistant'; parts?: UIMessagePart<any, any>[] }> = [];
  let initialHasMore = false;
  let initialDbRowCount = 0;
  let user: User | null = null;

  // ============================================
  // ACCESS CONTROL: Check conversation access before rendering
  // ============================================

  // Get user (for both auth and guest)
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

  if (user && user.id) {
    // Auth user: Check conversation access
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
  } else {
    // Guest: Check session_hash ownership
    const cookieStore = await cookies();
    const sessionIdCookie = cookieStore.get('session_id');
    const sessionId = sessionIdCookie?.value && isValidUUID(sessionIdCookie.value) 
      ? sessionIdCookie.value 
      : null;
    
    if (!sessionId) {
      // No session ID - redirect (guest needs session for access)
      logger.warn('Guest user accessing conversation without session ID', { conversationId });
      redirect('/');
    }

    const sessionHash = hmacSessionId(sessionId);
    const accessCheck = await checkGuestConversationAccess(conversationId, sessionHash);
    
    if (accessCheck.error) {
      logger.error('Database error during guest access check - failing secure', { conversationId });
      redirect('/');
    }
    
    if (accessCheck.exists && !accessCheck.belongsToSession) {
      logger.warn('Unauthorized guest conversation access', { conversationId, sessionHash });
      redirect('/');
    }
    
    if (!accessCheck.exists && !validatedParams.message) {
      logger.warn('Accessing non-existent guest conversation without message param', { conversationId });
      redirect('/');
    }
    
    // Load messages if conversation exists
    if (accessCheck.exists && accessCheck.belongsToSession) {
      try {
        const { messages, hasMore, dbRowCount } = await getGuestMessagesServerSide(conversationId, { limit: 50 });
        initialMessages = messages;
        initialHasMore = hasMore;
        initialDbRowCount = dbRowCount;
        logger.debug('Guest messages loaded', { 
          conversationId, 
          messageCount: initialMessages.length,
          hasMore: initialHasMore,
          dbRowCount: initialDbRowCount,
        });
      } catch (error) {
        // If message loading fails after access control passes, redirect (conversation exists but inaccessible)
        logger.error('Error loading guest messages after access control passes', error, { conversationId });
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
      initialMode={validatedParams.mode}
        user={user}
    />
    </ErrorBoundary>
  );
}
