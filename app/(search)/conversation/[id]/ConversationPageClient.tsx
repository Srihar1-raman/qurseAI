'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import HistorySidebar from '@/components/layout/history/HistorySidebar';
import { ConversationPageSkeleton } from '@/components/ui/ConversationPageSkeleton';
import type { User } from '@/lib/types';

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
  initialMessages: Array<{ id: string; role: 'user' | 'assistant'; parts: Array<{ type: string; text?: string; [key: string]: any }> }>;
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
  user,
}: ConversationPageClientProps) {
  const router = useRouter();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Handle New Chat button click
  const handleNewChat = () => {
    // Use router.push for proper navigation (we're on a different route)
    // This ensures proper Next.js navigation handling
    router.push('/');
  };

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

