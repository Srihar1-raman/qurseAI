/**
 * Hook for managing conversation lifecycle
 * Handles logout redirect, initial message sending, and interaction tracking
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createScopedLogger } from '@/lib/utils/logger';
import type { UIMessagePart } from 'ai';

const logger = createScopedLogger('hooks/use-conversation-lifecycle');

interface UseConversationLifecycleProps {
  conversationId: string;
  user: { id?: string } | null;
  isAuthLoading: boolean;
  hasInitialMessageParam: boolean;
  sendMessage: (message: { role: 'user'; parts: UIMessagePart<any, any>[] }) => void;
  initialMessageSentRef: React.MutableRefObject<boolean>;
}

interface UseConversationLifecycleReturn {
  hasInteracted: boolean;
  setHasInteracted: (value: boolean) => void;
}

export function useConversationLifecycle({
  conversationId,
  user,
  isAuthLoading,
  hasInitialMessageParam,
  sendMessage,
  initialMessageSentRef,
}: UseConversationLifecycleProps): UseConversationLifecycleReturn {
  const [hasInteracted, setHasInteracted] = useState(false);
  const router = useRouter();
  const previousUserRef = useRef<typeof user>(null);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (isAuthLoading || hasRedirectedRef.current) {
      previousUserRef.current = user;
      return;
    }

    const previousUser = previousUserRef.current;
    previousUserRef.current = user;

    if (previousUser && !user) {
      hasRedirectedRef.current = true;
      logger.debug('User logged out, redirecting to homepage', { conversationId });
      router.replace('/');
    }
  }, [isAuthLoading, user, router, conversationId]);

  useEffect(() => {
    if (initialMessageSentRef.current) return;

    const currentPathname = window.location.pathname;
    const pathnameMatch = currentPathname.match(/\/conversation\/([^/]+)/);
    const urlConversationId = pathnameMatch ? pathnameMatch[1] : null;

    if (conversationId !== urlConversationId) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const messageParam = params.get('message');

    if (!messageParam) return;

    initialMessageSentRef.current = true;
    setHasInteracted(true);

    let messageText: string;
    try {
      messageText = decodeURIComponent(messageParam);
    } catch {
      messageText = messageParam;
    }

    if (messageText && messageText.trim()) {
      params.delete('message');
      params.delete('model');
      params.delete('mode');
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);

      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: messageText }] as UIMessagePart<any, any>[],
      });
    }
  }, [hasInitialMessageParam, sendMessage, conversationId, initialMessageSentRef]);

  return {
    hasInteracted,
    setHasInteracted,
  };
}

