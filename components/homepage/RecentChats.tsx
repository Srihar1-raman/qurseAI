'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useConversationId } from '@/hooks/use-conversation-id';
import { useTyping } from '@/lib/contexts/TypingContext';
import { useMobile } from '@/hooks/use-mobile';
import { getConversations, getGuestConversations } from '@/lib/db/conversations';
import type { Conversation } from '@/lib/types';

export default function RecentChats() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const conversationId = useConversationId();
  const isTyping = useTyping();
  const isMobile = useMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Only show on home page (/), not on info, settings, or conversation pages
  const isHomePage = useMemo(() => pathname === '/', [pathname]);

  // Check sessionStorage on mount to see if user dismissed recent chats
  useEffect(() => {
    const dismissed = sessionStorage.getItem('recentChatsDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('recentChatsDismissed', 'true');
  };

  useEffect(() => {
    async function fetchRecentChats() {
      try {
        setIsLoading(true);

        let data;
        if (user?.id) {
          // Auth user: use getConversations, ignore pinned to get most recent
          data = await getConversations(user.id, { limit: 3, ignorePinned: true });
        } else {
          // Guest user: use getGuestConversations, ignore pinned to get most recent
          data = await getGuestConversations({ limit: 3, ignorePinned: true });
        }

        if (data.conversations.length > 0) {
          setConversations(data.conversations);
        }
      } catch (error) {
        // Fail silently - don't show recent chats if fetch fails
        console.error('Failed to fetch recent chats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecentChats();
  }, [user]);

  // Don't show anything while loading, on error, if no conversations, if typing, or if not on home page
  // Also don't show on mobile
  if (isLoading || conversations.length === 0 || !isHomePage || isTyping || isMobile || isDismissed) {
    return null;
  }

  const handleChatClick = (conversationId: string) => {
    router.push(`/conversation/${conversationId}`);
  };

  return (
    <div className="recent-chats">
      <button
        className="recent-chats-close"
        onClick={handleDismiss}
        aria-label="Close recent chats"
      >
        ✕
      </button>
      <div className="recent-chats-links">
        {conversations.map((chat, index) => (
          <div key={chat.id}>
            <button
              className="recent-chat-link"
              onClick={() => handleChatClick(chat.id)}
              title={chat.title}
            >
              {chat.title.length > 30 ? chat.title.slice(0, 30) + '...' : chat.title}
            </button>
            {index < conversations.length - 1 && (
              <div className="recent-chat-separator"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
