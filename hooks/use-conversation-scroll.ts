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

  // Track last scrolled message to prevent redundant scrolls
  const lastScrolledMessageIdRef = useRef<string | null>(null);
  const lastScrolledContentLengthRef = useRef<number>(0);
  const scrollScheduledRef = useRef(false);
  const lastScrollTimeRef = useRef<number>(0);
  const displayMessagesRef = useRef(displayMessages);
  
  // Track previous length and last message ID to detect actual changes
  // Use refs to avoid dependency on array reference
  const lastLengthRef = useRef(displayMessages.length);
  const lastMessageIdRef = useRef(
    displayMessages.length > 0 ? displayMessages[displayMessages.length - 1]?.id : null
  );

  // Extract primitives outside effect for dependency array
  // This prevents infinite loops - we only depend on values, not array reference
  const currentLength = displayMessages.length;
  const currentLastMessageId = displayMessages.length > 0 ? displayMessages[displayMessages.length - 1]?.id : null;

  // Sync ref only when length or last message ID actually changes
  // DO NOT depend on displayMessages array reference - this causes infinite loops during streaming
  // During streaming, displayMessages gets new reference on every chunk, but length/ID might not change
  useEffect(() => {
    // Only update ref if length changed or last message ID changed
    // This prevents unnecessary updates when only array reference changes (during streaming)
    if (
      currentLength !== lastLengthRef.current ||
      currentLastMessageId !== lastMessageIdRef.current
    ) {
      displayMessagesRef.current = displayMessages;
      lastLengthRef.current = currentLength;
      lastMessageIdRef.current = currentLastMessageId;
    }
    // Depend only on primitives (length and ID), not array reference
    // This ensures effect only runs when actual content changes, not on every render during streaming
  }, [currentLength, currentLastMessageId]);

  // Reset state when conversation changes
  useEffect(() => {
    hasInitiallyScrolledRef.current = false;
    lastUserMessageIdRef.current = null;
    lastScrolledMessageIdRef.current = null;
    lastScrolledContentLengthRef.current = 0;
    scrollScheduledRef.current = false;
    lastScrollTimeRef.current = 0;
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
  // Use requestAnimationFrame loop during streaming to detect content changes
  // This avoids infinite loops while still detecting content updates when length doesn't change
  // Optimized: Skip frames to reduce CPU usage (check every 2-3 frames instead of every frame)
  useEffect(() => {
    if (status !== 'streaming') {
      return;
    }

    let rafId: number | null = null;
    let frameSkipCounter = 0;
    const FRAME_SKIP = 2; // Check every 3rd frame (0, 1, 2 -> check on 2)

    const checkAndScroll = () => {
      // Skip frames to reduce CPU usage
      frameSkipCounter++;
      if (frameSkipCounter < FRAME_SKIP) {
        rafId = requestAnimationFrame(checkAndScroll);
        return;
      }
      frameSkipCounter = 0;

      // Stop if status changed (checked via closure - effect will clean up)
      const currentMessages = displayMessagesRef.current;
      if (currentMessages.length === 0) {
        rafId = requestAnimationFrame(checkAndScroll);
        return;
      }

      const lastMessage = currentMessages[currentMessages.length - 1];
      const lastMessageId = lastMessage?.id || null;
      const lastMessageContentLength = lastMessage?.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
        .map(p => p.text)
        .join('').length || 0;

      // Check if we need to scroll:
      // 1. New message appeared (ID changed)
      // 2. Content significantly changed (length difference > 50 chars) AND throttle time passed
      const isNewMessage = lastMessageId !== lastScrolledMessageIdRef.current;
      const contentChanged = Math.abs(lastMessageContentLength - lastScrolledContentLengthRef.current) > 50;
      const throttleTime = 150; // ms
      const timeSinceLastScroll = Date.now() - lastScrollTimeRef.current;
      const shouldThrottle = timeSinceLastScroll < throttleTime;

      if (isNewMessage || (contentChanged && !shouldThrottle && !scrollScheduledRef.current)) {
        lastScrolledMessageIdRef.current = lastMessageId;
        lastScrolledContentLengthRef.current = lastMessageContentLength;
        lastScrollTimeRef.current = Date.now();
        scrollScheduledRef.current = true;

        scrollToBottom();
        scrollScheduledRef.current = false;
      }

      // Continue loop while streaming
      // The effect will clean up when status changes
      rafId = requestAnimationFrame(checkAndScroll);
    };

    // Start the loop
    rafId = requestAnimationFrame(checkAndScroll);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [status, scrollToBottom]); // Only depend on status and scrollToBottom

  // Reset manual scroll when user sends a new message (allows auto-scroll for AI response)
  useEffect(() => {
    // Access current messages from ref (avoids dependency on array reference)
    const currentMessages = displayMessagesRef.current;
    if (currentMessages.length === 0) {
      return;
    }

    const lastMessage = currentMessages[currentMessages.length - 1];
    const isNewUserMessage =
      lastMessage?.role === 'user' && lastMessage?.id !== lastUserMessageIdRef.current;

    if (
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
    displayMessages.length, // Use length instead of entire array
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

