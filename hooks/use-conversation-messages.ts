/**
 * Hook for managing conversation messages
 * Handles loading, merging, and transforming messages from database and useChat
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { getOlderMessages } from '@/lib/db/queries';
import { handleClientError } from '@/lib/utils/error-handler';
import { mergeMessages, transformToQurseMessage } from '@/lib/conversation/message-utils';
import { createScopedLogger } from '@/lib/utils/logger';
import type { QurseMessage } from '@/lib/types';

const logger = createScopedLogger('hooks/use-conversation-messages');

import type { UIMessagePart } from 'ai';

interface BaseMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  parts?: UIMessagePart<any, any>[];
  content?: string;
  metadata?: any;
  createdAt?: string;
}

// Helper to extract message content for deep equality comparison
function extractMessageContent(message: BaseMessage): string {
  if (message.parts && Array.isArray(message.parts) && message.parts.length > 0) {
    return message.parts
      .map((p) => ('text' in p ? p.text : ''))
      .join('')
      .trim();
  }
  if (message.content) {
    return String(message.content).trim();
  }
  return '';
}

interface UseConversationMessagesProps {
  conversationId: string;
  initialMessages: BaseMessage[];
  initialHasMore?: boolean;
  initialDbRowCount?: number;
  useChatMessages: BaseMessage[];
  user: { id?: string } | null;
  showToastError: (message: string) => void;
  initialMessageSentRef: React.MutableRefObject<boolean>;
  conversationIdRef: React.MutableRefObject<string>;
  hasInitialMessageParam: boolean;
  status: 'idle' | 'streaming' | 'submitted' | string;
}

interface UseConversationMessagesReturn {
  displayMessages: QurseMessage[];
  displayMessagesRef: React.MutableRefObject<QurseMessage[]>; // Always has latest content, even during throttling
  isLoadingOlderMessages: boolean;
  isLoadingInitialMessages: boolean;
  hasMoreMessages: boolean;
  loadOlderMessages: () => Promise<void>;
  scrollPositionRef: React.MutableRefObject<{ height: number; top: number } | null>;
  loadedMessagesLength: number;
}

export function useConversationMessages({
  conversationId,
  initialMessages,
  initialHasMore = false,
  initialDbRowCount = 0,
  useChatMessages,
  user,
  showToastError,
  initialMessageSentRef,
  conversationIdRef,
  hasInitialMessageParam,
  status,
}: UseConversationMessagesProps): UseConversationMessagesReturn {
  const [loadedMessages, setLoadedMessages] = useState<BaseMessage[]>(initialMessages);
  const useChatMessagesRef = useRef(useChatMessages);
  
  // Keep ref in sync with useChatMessages
  useEffect(() => {
    useChatMessagesRef.current = useChatMessages;
  }, [useChatMessages]);
  const [messagesOffset, setMessagesOffset] = useState(initialDbRowCount || initialMessages.length);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [isLoadingInitialMessages, setIsLoadingInitialMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(initialHasMore ?? initialMessages.length >= 50);
  const scrollPositionRef = useRef<{ height: number; top: number } | null>(null);
  const previousConversationIdRef = useRef<string | null>(null);

  const loadInitialMessages = useCallback(
    async (id: string) => {
      if (conversationIdRef.current !== id) {
        return;
      }

      try {
        setIsLoadingInitialMessages(true);

        const apiRoute = user
          ? `/api/conversation/${id}/messages?limit=50&offset=0`
          : `/api/guest/conversation/${id}/messages?limit=50&offset=0`;

        const response = await fetch(apiRoute);

        if (response.status === 404) {
          logger.debug('Conversation not found (likely new conversation)', { conversationId: id });
          setIsLoadingInitialMessages(false);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load messages');
        }

        const { messages, hasMore, dbRowCount } = await response.json();

        if (conversationIdRef.current !== id) {
          return;
        }

        // Don't update loadedMessages if useChatMessages already has messages
        // This prevents flashing when messages are already streaming via useChat
        // The mergeMessages function will handle merging when needed
        if (useChatMessagesRef.current.length === 0) {
          setLoadedMessages(messages);
          setMessagesOffset(dbRowCount);
          setHasMoreMessages(hasMore);
        } else {
          // Still update offset and hasMore for future pagination, but don't replace messages
          setMessagesOffset(dbRowCount);
          setHasMoreMessages(hasMore);
          logger.debug('Skipped updating loadedMessages - useChatMessages already has messages', {
            conversationId: id,
            useChatMessagesCount: useChatMessagesRef.current.length,
          });
        }
      } catch (error) {
        if (conversationIdRef.current === id && !initialMessageSentRef.current) {
          const userMessage = handleClientError(error as Error, 'conversation/loadInitialMessages');
          showToastError(userMessage);
        }
      } finally {
        if (conversationIdRef.current === id) {
          setIsLoadingInitialMessages(false);
        }
      }
    },
    [showToastError, user, initialMessageSentRef, conversationIdRef]
  );

  useEffect(() => {
    const previousId = previousConversationIdRef.current;
    const hasConversationChanged = previousId !== conversationId;

    conversationIdRef.current = conversationId;
    previousConversationIdRef.current = conversationId;

    if (hasConversationChanged) {
      initialMessageSentRef.current = false;

      if (initialMessages.length > 0) {
        setLoadedMessages(initialMessages);
        setMessagesOffset(initialDbRowCount || initialMessages.length);
        setHasMoreMessages(initialHasMore ?? initialMessages.length >= 50);
        setIsLoadingInitialMessages(false);
        return;
      }

      setLoadedMessages([]);
      setMessagesOffset(0);
      setHasMoreMessages(false);

      if (
        conversationId &&
        !conversationId.startsWith('temp-') &&
        !hasInitialMessageParam
      ) {
        setIsLoadingInitialMessages(true);
        loadInitialMessages(conversationId);
      } else {
        setIsLoadingInitialMessages(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // Only depend on conversationId - other values are initial props that shouldn't change

  useEffect(() => {
    if (conversationIdRef.current !== conversationId) {
      return;
    }

    if (initialMessages.length > 0) {
      setLoadedMessages(initialMessages);
      setMessagesOffset(initialDbRowCount || initialMessages.length);
      setHasMoreMessages(initialHasMore ?? initialMessages.length >= 50);
      setIsLoadingInitialMessages(false);
    }
  }, [conversationId, initialMessages, initialHasMore, initialDbRowCount, conversationIdRef]);

  useEffect(() => {
    if (
      conversationId &&
      !conversationId.startsWith('temp-') &&
      !hasInitialMessageParam &&
      loadedMessages.length === 0 &&
      !isLoadingInitialMessages &&
      !initialMessageSentRef.current &&
      status !== 'submitted' &&
      status !== 'streaming' &&
      useChatMessages.length === 0 && // Don't load if messages are already streaming via useChat
      conversationIdRef.current === conversationId
    ) {
      logger.debug('Loading messages for conversation', { conversationId });
      setIsLoadingInitialMessages(true);
      loadInitialMessages(conversationId);
    }
  }, [
    conversationId,
    hasInitialMessageParam,
    loadedMessages.length,
    isLoadingInitialMessages,
    status,
    useChatMessages.length, // Add dependency
    loadInitialMessages,
    initialMessageSentRef,
    conversationIdRef,
  ]);

  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlderMessages || !hasMoreMessages || conversationId.startsWith('temp-')) {
      return;
    }

    setIsLoadingOlderMessages(true);

    try {
      const { messages: olderMessages, hasMore, dbRowCount } = await getOlderMessages(
        conversationId,
        50,
        messagesOffset
      );

      setHasMoreMessages(hasMore);

      if (!hasMore && olderMessages.length === 0) {
        scrollPositionRef.current = null;
        return;
      }

      if (olderMessages.length > 0) {
        const filteredMessages = olderMessages.filter(
          (msg): msg is typeof msg & { role: 'user' | 'assistant' } =>
            msg.role === 'user' || msg.role === 'assistant'
        );
        if (filteredMessages.length > 0) {
          setLoadedMessages((prev) => [...filteredMessages, ...prev]);
        }
      }

      setMessagesOffset((prev) => prev + dbRowCount);

      if (olderMessages.length === 0 && hasMore) {
        scrollPositionRef.current = null;
      }
    } catch (error) {
      const userMessage = handleClientError(error as Error, 'conversation/loadOlderMessages');
      showToastError(userMessage);
      setHasMoreMessages(false);
      scrollPositionRef.current = null;
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }, [conversationId, messagesOffset, isLoadingOlderMessages, hasMoreMessages, showToastError]);

  // Create a content-based key for useChatMessages to detect actual content changes (not just reference)
  const useChatMessagesKey = useMemo(() => {
    return useChatMessages.map(m => `${m.id}:${m.role}:${extractMessageContent(m)}`).join('|');
  }, [useChatMessages]);

  // Memoize useChatMessages to prevent unnecessary recalculations when reference changes but content is same
  const stableUseChatMessages = useMemo(() => {
    return useChatMessages;
  }, [useChatMessagesKey]);

  const rawDisplayMessages = useMemo(() => {
    return mergeMessages(loadedMessages, stableUseChatMessages, isLoadingInitialMessages);
  }, [loadedMessages, stableUseChatMessages, isLoadingInitialMessages]);

  // Track message structure (count and IDs) separately from content
  // This allows us to detect structure changes (new messages) vs content changes (streaming)
  const messageStructureKey = useMemo(() => {
    return rawDisplayMessages.map(m => `${m.id}:${m.role}`).join('|');
  }, [rawDisplayMessages]);

  // Track previous structure to detect when new messages are added
  const previousStructureRef = useRef<string>('');
  const isStructureChanged = messageStructureKey !== previousStructureRef.current;

  // During streaming, use requestAnimationFrame batching for smooth 60fps updates
  // Strategy: Update immediately on structure changes, batch content-only updates via RAF
  const isStreaming = status === 'streaming';
  
  // Ref to cache the last returned displayMessages (for RAF batching during streaming)
  const cachedDisplayMessagesRef = useRef<QurseMessage[]>([]);
  const rafScheduledRef = useRef<number | null>(null); // Track pending RAF callback
  const pendingUpdateRef = useRef<QurseMessage[] | null>(null); // Store pending update
  
  // Always transform to get latest content
  const transformedMessages = useMemo(() => {
    return transformToQurseMessage(rawDisplayMessages);
  }, [rawDisplayMessages]);

  // Ref to expose latest messages to scroll hook (always up-to-date, even during throttling)
  // This allows RAF loop to read latest content while displayMessages is throttled
  const latestMessagesRef = useRef<QurseMessage[]>([]);
  
  // Always keep latestMessagesRef updated with latest content (for scroll hook RAF loop)
  // Update directly from rawDisplayMessages to bypass memoization chain issues
  // This ensures ref is always updated during streaming, even if transformedMessages reference doesn't change
  useEffect(() => {
    // Transform directly here to ensure we always have latest content
    const latest = transformToQurseMessage(rawDisplayMessages);
    latestMessagesRef.current = latest;
  }, [rawDisplayMessages]);

  // Use state to trigger re-renders when RAF updates cached messages
  const [, setForceUpdate] = useState(0);
  
  // Memoize displayMessages with smart update strategy during streaming
  // Uses requestAnimationFrame batching for smooth 60fps updates (ChatGPT-like smoothness)
  const displayMessages = useMemo(() => {
    // Always update when structure changes (new message added) - immediate update
    if (isStructureChanged) {
      previousStructureRef.current = messageStructureKey;
      cachedDisplayMessagesRef.current = transformedMessages;
      
      // Cancel any pending RAF since we're updating immediately
      if (rafScheduledRef.current !== null && typeof requestAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafScheduledRef.current);
        rafScheduledRef.current = null;
      }
      pendingUpdateRef.current = null;
      
      return transformedMessages;
    }

    // During streaming: use requestAnimationFrame batching for smooth updates
    // This creates 60fps (16ms) updates instead of fixed 150ms delays
    if (isStreaming) {
      // Store the latest content for RAF callback
      pendingUpdateRef.current = transformedMessages;
      
      // Schedule RAF update if not already scheduled
      if (rafScheduledRef.current === null && typeof requestAnimationFrame !== 'undefined') {
        rafScheduledRef.current = requestAnimationFrame(() => {
          try {
            // Update cached messages with pending update
            if (pendingUpdateRef.current !== null) {
              cachedDisplayMessagesRef.current = pendingUpdateRef.current;
              pendingUpdateRef.current = null;
              // Force re-render by updating state
              setForceUpdate(prev => prev + 1);
            }
            rafScheduledRef.current = null;
          } catch (error) {
            // Fallback: update immediately on error
            console.error('Error in RAF callback for displayMessages:', error);
            cachedDisplayMessagesRef.current = transformedMessages;
            setForceUpdate(prev => prev + 1);
            rafScheduledRef.current = null;
            pendingUpdateRef.current = null;
          }
        });
    }
    
      // Return cached reference during streaming (prevents infinite loops)
      // RAF callback will update cached reference on next frame and trigger re-render
      // Note: latestMessagesRef is always updated above, so scroll hook can read latest content
      return cachedDisplayMessagesRef.current.length > 0 
        ? cachedDisplayMessagesRef.current 
        : transformedMessages;
    }

    // Not streaming: always return latest (normal behavior)
    // Clean up any pending RAF
    if (rafScheduledRef.current !== null && typeof requestAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafScheduledRef.current);
      rafScheduledRef.current = null;
    }
    pendingUpdateRef.current = null;
    
    previousStructureRef.current = messageStructureKey;
    cachedDisplayMessagesRef.current = transformedMessages;
    return transformedMessages;
  }, [messageStructureKey, isStructureChanged, isStreaming, transformedMessages]);
  
  // Cleanup RAF on unmount or status change
  useEffect(() => {
    return () => {
      if (rafScheduledRef.current !== null && typeof requestAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafScheduledRef.current);
        rafScheduledRef.current = null;
      }
      pendingUpdateRef.current = null;
    };
  }, [status]);

  return {
    displayMessages,
    displayMessagesRef: latestMessagesRef, // Expose ref with always-latest content for scroll hook
    isLoadingOlderMessages,
    isLoadingInitialMessages,
    hasMoreMessages,
    loadOlderMessages,
    scrollPositionRef,
    loadedMessagesLength: loadedMessages.length,
  };
}

