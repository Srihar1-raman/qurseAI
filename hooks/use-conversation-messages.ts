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
  }, [
    conversationId,
    initialMessages,
    initialHasMore,
    initialDbRowCount,
    hasInitialMessageParam,
    loadInitialMessages,
    initialMessageSentRef,
    conversationIdRef,
  ]);

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

  // Create a content-based key for rawDisplayMessages to detect actual content changes
  const rawDisplayMessagesKey = useMemo(() => {
    return rawDisplayMessages.map(m => `${m.id}:${m.role}:${extractMessageContent(m)}`).join('|');
  }, [rawDisplayMessages]);

  // Memoize transformToQurseMessage to prevent creating new objects when content hasn't changed
  // Use ref to store previous result and only recalculate when key actually changes
  const displayMessagesRef = useRef<{ messages: QurseMessage[]; key: string }>({ messages: [], key: '' });
  
  const displayMessages = useMemo(() => {
    // Only recalculate if content actually changed (key-based comparison)
    if (rawDisplayMessagesKey === displayMessagesRef.current.key && displayMessagesRef.current.messages.length > 0) {
      return displayMessagesRef.current.messages;
    }
    
    // Content changed - recalculate
    const transformed = transformToQurseMessage(rawDisplayMessages);
    displayMessagesRef.current = { messages: transformed, key: rawDisplayMessagesKey };
    return transformed;
  }, [rawDisplayMessagesKey]); // Only depend on key, not rawDisplayMessages array reference

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

