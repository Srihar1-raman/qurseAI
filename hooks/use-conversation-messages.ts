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

interface BaseMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  parts?: Array<{ type: string; text?: string; [key: string]: any }>;
  content?: string;
  metadata?: any;
  createdAt?: string;
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
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load messages');
        }

        const { messages, hasMore, dbRowCount } = await response.json();

        if (conversationIdRef.current !== id) {
          return;
        }

        setLoadedMessages(messages);
        setMessagesOffset(dbRowCount);
        setHasMoreMessages(hasMore);
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

  const rawDisplayMessages = useMemo(() => {
    return mergeMessages(loadedMessages, useChatMessages, isLoadingInitialMessages);
  }, [loadedMessages, useChatMessages, isLoadingInitialMessages]);

  const displayMessages = useMemo(() => {
    return transformToQurseMessage(rawDisplayMessages);
  }, [rawDisplayMessages]);

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

