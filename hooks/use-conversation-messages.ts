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

  // During streaming, throttle displayMessages updates to prevent infinite loops
  // Strategy: Update immediately on structure changes, but throttle content-only updates
  const isStreaming = status === 'streaming';
  
  // Ref to cache the last returned displayMessages (for throttling during streaming)
  const cachedDisplayMessagesRef = useRef<QurseMessage[]>([]);
  const lastUpdateTimeRef = useRef<number>(0);
  const THROTTLE_MS = 150; // Update at most every 150ms during streaming
  
  // Always transform to get latest content
  const transformedMessages = useMemo(() => {
    return transformToQurseMessage(rawDisplayMessages);
  }, [rawDisplayMessages]);

  // Memoize displayMessages with smart update strategy during streaming
  const displayMessages = useMemo(() => {
    const now = Date.now();
    
    // Always update when structure changes (new message added) - immediate update
    if (isStructureChanged) {
      previousStructureRef.current = messageStructureKey;
      cachedDisplayMessagesRef.current = transformedMessages;
      lastUpdateTimeRef.current = now;
      return transformedMessages;
    }

    // During streaming: throttle content-only updates to prevent infinite loops
    // This prevents new references on every chunk while still showing progress
    if (isStreaming) {
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
      
      // Update if throttle time has passed (allows UI to show progress)
      if (timeSinceLastUpdate >= THROTTLE_MS) {
        cachedDisplayMessagesRef.current = transformedMessages;
        lastUpdateTimeRef.current = now;
        return transformedMessages;
      }
      
      // Within throttle window - return cached reference to prevent re-render
      // This breaks the infinite loop while still allowing periodic updates
      return cachedDisplayMessagesRef.current.length > 0 
        ? cachedDisplayMessagesRef.current 
        : transformedMessages;
    }

    // Not streaming: always return latest (normal behavior)
    previousStructureRef.current = messageStructureKey;
    cachedDisplayMessagesRef.current = transformedMessages;
    lastUpdateTimeRef.current = now;
    return transformedMessages;
  }, [messageStructureKey, isStructureChanged, isStreaming, transformedMessages]);

  return {
    displayMessages,
    isLoadingOlderMessages,
    isLoadingInitialMessages,
    hasMoreMessages,
    loadOlderMessages,
    scrollPositionRef,
    loadedMessagesLength: loadedMessages.length,
  };
}

