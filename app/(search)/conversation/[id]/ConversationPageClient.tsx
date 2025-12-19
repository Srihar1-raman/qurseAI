'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import HistorySidebar from '@/components/layout/history/HistorySidebar';
import { ConversationPageSkeleton } from '@/components/ui/ConversationPageSkeleton';
import { useAuth } from '@/lib/contexts/AuthContext';
import { createScopedLogger } from '@/lib/utils/logger';
import type { User } from '@/lib/types';
import type { UIMessagePart } from 'ai';

const logger = createScopedLogger('conversation/ConversationPageClient');

// Lazy load ConversationClient to code split AI SDK
// AI SDK code is only loaded when user navigates to a conversation page
// Loading state uses same skeleton as NavigationWrapper for seamless transition
const ConversationClient = dynamic(
  () => import('@/components/conversation/ConversationClient').then(mod => ({ default: mod.ConversationClient })),
  {
    loading: () => <ConversationPageSkeleton />,
  }
);

interface ConversationPageClientProps {
  conversationId: string;
  initialMessages: Array<{ id: string; role: 'user' | 'assistant'; parts?: UIMessagePart<any, any>[] }>;
  initialHasMore: boolean;
  initialDbRowCount: number;
  hasInitialMessageParam: boolean;
  user: User | null;
}

// Client component wrapper for HistorySidebar state management
// Server component cannot use useState, so we need a client wrapper
export default function ConversationPageClient({
  conversationId,
  initialMessages,
  initialHasMore,
  initialDbRowCount,
  hasInitialMessageParam,
  user: userProp,
}: ConversationPageClientProps) {
  const router = useRouter();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { user: authUser, isLoading: isAuthLoading } = useAuth();
  const previousUserPropRef = useRef(userProp);
  const previousAuthUserRef = useRef(authUser);
  const hasRedirectedRef = useRef(false);

  // Handle logout: Redirect to homepage when user logs out
  // This handles the case where user logs out in another tab while on conversation route
  useEffect(() => {
    const previousUserProp = previousUserPropRef.current;
    const previousAuthUser = previousAuthUserRef.current;
    
    previousUserPropRef.current = userProp;
    previousAuthUserRef.current = authUser;
    
    // Don't redirect while auth is still loading (prevents race condition)
    if (isAuthLoading || hasRedirectedRef.current) {
      return;
    }
    
    // If user was authenticated (prop or context) but now logged out (context), redirect
    if ((previousUserProp || previousAuthUser) && !authUser) {
      hasRedirectedRef.current = true;
      logger.debug('User logged out, redirecting to homepage', { conversationId });
      router.replace('/');
    }
  }, [isAuthLoading, userProp, authUser, router, conversationId]);

  // Handle New Chat button click
  const handleNewChat = () => {
    // Use router.push for proper navigation (we're on a different route)
    // This ensures proper Next.js navigation handling
    router.push('/');
  };
  
  // Use authUser from context instead of userProp for Header (reacts to auth changes)
  const user = authUser || userProp;

  return (
    <div className="homepage-container">
      <Header 
        user={user}
        showHistoryButton={true}
        onHistoryClick={() => setIsHistoryOpen(true)}
        showNewChatButton={true}
        onNewChatClick={handleNewChat}
      />
      
      {/* ConversationClient with server-loaded messages */}
      <ConversationClient
        conversationId={conversationId}
        initialMessages={initialMessages}
        initialHasMore={initialHasMore}
        initialDbRowCount={initialDbRowCount}
        hasInitialMessageParam={hasInitialMessageParam}
      />
      
      {/* History Sidebar */}
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}

