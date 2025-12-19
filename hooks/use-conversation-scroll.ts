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
  const previousScrollTopRef = useRef<number>(0);

  const { scrollToBottom, markManualScroll, resetManualScroll } = useOptimizedScroll(conversationContainerRef);

  // Reset state when conversation changes
  useEffect(() => {
    hasInitiallyScrolledRef.current = false;
    lastUserMessageIdRef.current = null;
    resetManualScroll();
    const containerElement = conversationContainerRef.current;
    if (containerElement) {
      previousScrollTopRef.current = containerElement.scrollTop;
    }
  }, [conversationId, resetManualScroll]);

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
    // conversationContainerRef is the scrollable container, not conversationThreadRef
    const containerElement = conversationContainerRef.current;
    if (!containerElement) return;

    const handleScroll = () => {
      if (containerElement.scrollTop > 200) {
        isScrollTopDetectedRef.current = false;
      }

      if (
        containerElement.scrollTop < 100 &&
        !isScrollTopDetectedRef.current &&
        hasMoreMessages &&
        !isLoadingOlderMessages
      ) {
        isScrollTopDetectedRef.current = true;
        loadOlderMessages();
      }
    };

    containerElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => containerElement.removeEventListener('scroll', handleScroll);
  }, [loadOlderMessages, hasMoreMessages, isLoadingOlderMessages]);

  // Detect manual scroll - works even when container isn't scrollable yet (first message case)
  useEffect(() => {
    const containerElement = conversationContainerRef.current;
    if (!containerElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = containerElement;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const threshold = 100;
      const previousScrollTop = previousScrollTopRef.current;

      // Mark as manual scroll if user scrolled UP and is away from bottom
      if (scrollTop < previousScrollTop && distanceFromBottom > threshold) {
        markManualScroll();
      } else if (distanceFromBottom <= threshold) {
        // User is near bottom - allow autoscroll
        resetManualScroll();
      }

      previousScrollTopRef.current = scrollTop;
    };

    // Detect wheel events (works even when container isn't scrollable yet)
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        markManualScroll();
      }
    };

    // Detect touch events (mobile, works even when container isn't scrollable yet)
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY === 0) return;
      const touchDelta = touchStartY - e.touches[0].clientY;
      if (touchDelta < -10) {
        markManualScroll();
      }
    };

    containerElement.addEventListener('scroll', handleScroll, { passive: true });
    containerElement.addEventListener('wheel', handleWheel, { passive: true });
    containerElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    containerElement.addEventListener('touchmove', handleTouchMove, { passive: true });
    
    return () => {
      containerElement.removeEventListener('scroll', handleScroll);
      containerElement.removeEventListener('wheel', handleWheel);
      containerElement.removeEventListener('touchstart', handleTouchStart);
      containerElement.removeEventListener('touchmove', handleTouchMove);
    };
  }, [markManualScroll, resetManualScroll]);

  // Reset manual scroll when streaming starts (only if user is near bottom)
  useEffect(() => {
    if (status === 'streaming') {
      const containerElement = conversationContainerRef.current;
      if (containerElement) {
        const { scrollTop, scrollHeight, clientHeight } = containerElement;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        if (distanceFromBottom <= 100) {
          resetManualScroll();
          requestAnimationFrame(() => scrollToBottom());
        }
      } else {
        // Container not ready yet (first message case) - reset manual scroll anyway
        resetManualScroll();
      }
    }
  }, [status, resetManualScroll, scrollToBottom]);

  // Auto-scroll during streaming when messages change
  useEffect(() => {
    if (status === 'streaming') {
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [displayMessages, status, scrollToBottom]);

  // Reset manual scroll when user sends a new message (allows auto-scroll for AI response)
  useEffect(() => {
    const lastMessage = displayMessages[displayMessages.length - 1];
    const isNewUserMessage =
      lastMessage?.role === 'user' && lastMessage?.id !== lastUserMessageIdRef.current;

    if (
      displayMessages.length > 0 &&
      isNewUserMessage &&
      hasInteracted &&
      !isLoadingOlderMessages &&
      !isLoadingInitialMessages
    ) {
      lastUserMessageIdRef.current = lastMessage.id;
      resetManualScroll();

      if (status !== 'streaming') {
        requestAnimationFrame(() => scrollToBottom());
      }
    }
  }, [
    displayMessages,
    status,
    hasInteracted,
    isLoadingOlderMessages,
    isLoadingInitialMessages,
    scrollToBottom,
    resetManualScroll,
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

