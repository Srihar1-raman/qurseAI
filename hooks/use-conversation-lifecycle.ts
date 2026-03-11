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
  conversationId: string | undefined;
  user: { id?: string } | null;
  isAuthLoading: boolean;
  hasInitialMessageParam: boolean;
  sendMessage: (message: { role: 'user'; parts: UIMessagePart<any, any>[]; attachments?: any[] }) => void;
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
    const attachmentsParam = params.get('attachments');

    if (!messageParam && !attachmentsParam) return;

    initialMessageSentRef.current = true;
    setHasInteracted(true);

    let messageText: string;
    try {
      messageText = messageParam ? decodeURIComponent(messageParam) : '';
    } catch {
      messageText = messageParam || '';
    }

    let attachments: any[] = [];
    if (attachmentsParam) {
      try {
        attachments = JSON.parse(decodeURIComponent(attachmentsParam));
      } catch {
        console.error('Failed to parse attachments param');
      }
    }

    if (messageText.trim() || attachments.length > 0) {
      params.delete('message');
      params.delete('model');
      params.delete('mode');
      params.delete('attachments');
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);

      sendMessage({
        role: 'user',
        parts: messageText.trim() ? [{ type: 'text', text: messageText }] as UIMessagePart<any, any>[] : [],
        attachments: attachments.length > 0 ? attachments : undefined,
      });
    }
  }, [hasInitialMessageParam, sendMessage, conversationId, initialMessageSentRef]);

  return {
    hasInteracted,
    setHasInteracted,
  };
}

