/**
 * Hook for managing conversation scroll behavior
 * Handles auto-scroll, scroll restoration, and scroll-to-top pagination detection
 */

import { useRef, useEffect } from 'react';
import { useOptimizedScroll } from './use-optimized-scroll';
import type { QurseMessage } from '@/lib/types';

interface UseConversationScrollProps {
  displayMessages: QurseMessage[];
  status: 'idle' | 'streaming' | 'submitted' | string;
  hasInteracted: boolean;
  isLoadingOlderMessages: boolean;
  isLoadingInitialMessages: boolean;
  hasMoreMessages: boolean;
  loadedMessagesLength: number;
  loadOlderMessages: () => Promise<void>;
  scrollPositionRef: React.MutableRefObject<{ height: number; top: number } | null>;
  conversationId: string;
}

interface UseConversationScrollReturn {
  conversationEndRef: React.RefObject<HTMLDivElement | null>;
  conversationContainerRef: React.RefObject<HTMLDivElement | null>;
  conversationThreadRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: () => void;
}

export function useConversationScroll({
  displayMessages,
  status,
  hasInteracted,
  isLoadingOlderMessages,
  isLoadingInitialMessages,
  hasMoreMessages,
  loadOlderMessages,
  scrollPositionRef,
  loadedMessagesLength,
  conversationId,
}: UseConversationScrollProps): UseConversationScrollReturn {
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const conversationContainerRef = useRef<HTMLDivElement>(null);
  const conversationThreadRef = useRef<HTMLDivElement>(null);
  const hasInitiallyScrolledRef = useRef(false);
  const lastUserMessageIdRef = useRef<string | null>(null);
  const isScrollTopDetectedRef = useRef(false);

  const { scrollToBottom, markManualScroll, resetManualScroll } = useOptimizedScroll(conversationEndRef);

  useEffect(() => {
    hasInitiallyScrolledRef.current = false;
    lastUserMessageIdRef.current = null;
  }, [conversationId]);

  useEffect(() => {
    if (!isLoadingOlderMessages && scrollPositionRef.current) {
      const containerElement = conversationContainerRef.current;
      if (!containerElement) {
        scrollPositionRef.current = null;
        return;
      }

      const saved = scrollPositionRef.current;

      requestAnimationFrame(() => {
        if (containerElement && saved) {
          const scrollHeightAfter = containerElement.scrollHeight;
          const heightDifference = scrollHeightAfter - saved.height;
          containerElement.scrollTop = saved.top + heightDifference;
          scrollPositionRef.current = null;
        }
      });
    }
  }, [loadedMessagesLength, isLoadingOlderMessages, scrollPositionRef]);

  useEffect(() => {
    const threadElement = conversationThreadRef.current;
    if (!threadElement) return;

    const handleScroll = () => {
      if (threadElement.scrollTop > 200) {
        isScrollTopDetectedRef.current = false;
      }

      if (
        threadElement.scrollTop < 100 &&
        !isScrollTopDetectedRef.current &&
        hasMoreMessages &&
        !isLoadingOlderMessages
      ) {
        isScrollTopDetectedRef.current = true;
        loadOlderMessages();
      }
    };

    threadElement.addEventListener('scroll', handleScroll);
    return () => threadElement.removeEventListener('scroll', handleScroll);
  }, [loadOlderMessages, hasMoreMessages, isLoadingOlderMessages]);

  useEffect(() => {
    const handleManualScroll = () => markManualScroll();
    window.addEventListener('wheel', handleManualScroll);
    window.addEventListener('touchmove', handleManualScroll);
    return () => {
      window.removeEventListener('wheel', handleManualScroll);
      window.removeEventListener('touchmove', handleManualScroll);
    };
  }, [markManualScroll]);

  useEffect(() => {
    if (status === 'streaming') {
      resetManualScroll();
      scrollToBottom();
    }
  }, [status, resetManualScroll, scrollToBottom]);

  useEffect(() => {
    if (status === 'streaming') {
      scrollToBottom();
    }
  }, [displayMessages, status, scrollToBottom]);

  useEffect(() => {
    const lastMessage = displayMessages[displayMessages.length - 1];
    const isNewUserMessage =
      lastMessage?.role === 'user' && lastMessage?.id !== lastUserMessageIdRef.current;

    if (
      displayMessages.length > 0 &&
      isNewUserMessage &&
      status !== 'streaming' &&
      hasInteracted &&
      !isLoadingOlderMessages &&
      !isLoadingInitialMessages
    ) {
      lastUserMessageIdRef.current = lastMessage.id;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      });
    }
  }, [
    displayMessages,
    status,
    hasInteracted,
    isLoadingOlderMessages,
    isLoadingInitialMessages,
    scrollToBottom,
  ]);

  useEffect(() => {
    if (
      loadedMessagesLength > 0 &&
      !hasInteracted &&
      !isLoadingOlderMessages &&
      status !== 'streaming' &&
      !isLoadingInitialMessages &&
      !hasInitiallyScrolledRef.current
    ) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
        hasInitiallyScrolledRef.current = true;
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [
    loadedMessagesLength,
    hasInteracted,
    isLoadingOlderMessages,
    status,
    isLoadingInitialMessages,
    scrollToBottom,
  ]);

  return {
    conversationEndRef,
    conversationContainerRef,
    conversationThreadRef,
    scrollToBottom,
  };
}

