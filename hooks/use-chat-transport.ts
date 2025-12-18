/**
 * Hook for managing chat transport and useChat integration
 * Handles transport creation, error handling, and rate limit detection
 */

import { useMemo, useRef, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessagePart } from 'ai';
import { isRateLimitError, extractRateLimitInfo } from '@/lib/conversation/rate-limit-utils';
import { handleClientError } from '@/lib/utils/error-handler';
import type { RateLimitState } from '@/lib/contexts/RateLimitContext';

interface UseChatTransportProps {
  conversationId: string;
  selectedModel: string;
  chatMode: string;
  user: { id?: string } | null;
  setRateLimitState: (state: RateLimitState) => void;
  showToastError: (message: string) => void;
}

interface UseChatTransportReturn {
  messages: ReturnType<typeof useChat>['messages'];
  sendMessage: (message: { role: 'user'; parts: UIMessagePart<any, any>[] }) => void;
  status: ReturnType<typeof useChat>['status'];
  error: ReturnType<typeof useChat>['error'];
}

export function useChatTransport({
  conversationId,
  selectedModel,
  chatMode,
  user,
  setRateLimitState,
  showToastError,
}: UseChatTransportProps): UseChatTransportReturn {
  const conversationIdRef = useRef(conversationId);
  const selectedModelRef = useRef(selectedModel);
  const chatModeRef = useRef(chatMode);

  useMemo(() => {
    conversationIdRef.current = conversationId;
    selectedModelRef.current = selectedModel;
    chatModeRef.current = chatMode;
  }, [conversationId, selectedModel, chatMode]);

  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest({ messages }) {
        return {
          body: {
            messages,
            conversationId: conversationIdRef.current,
            model: selectedModelRef.current,
            chatMode: chatModeRef.current,
          },
        };
      },
    });
  }, []);

  const handleError = useCallback(
    (error: Error & { status?: number; cause?: any; response?: Response }) => {
      if (isRateLimitError(error)) {
        const rateLimitInfo = extractRateLimitInfo(error);

        setRateLimitState({
          isRateLimited: true,
          resetTime: rateLimitInfo.resetTime,
          userType: user ? 'free' : 'guest',
          layer: rateLimitInfo.layer,
        });

        return;
      }

      const userMessage = handleClientError(error, 'conversation/chat');
      showToastError(userMessage);
    },
    [user, setRateLimitState, showToastError]
  );

  const chatResult = useChat({
    id: conversationId,
    transport,
    onError: handleError,
  });

  return {
    messages: chatResult.messages,
    sendMessage: chatResult.sendMessage,
    status: chatResult.status,
    error: chatResult.error,
  };
}

