/**
 * Hook for managing chat transport and useChat integration
 * Handles transport creation, error handling, and rate limit detection
 */

import { useEffect, useMemo, useRef, useCallback } from 'react';
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
  onSendAttempt?: () => void;
}

interface UseChatTransportReturn {
  messages: ReturnType<typeof useChat>['messages'];
  sendMessage: (message: { role: 'user'; parts: UIMessagePart<any, any>[] }) => void;
  status: ReturnType<typeof useChat>['status'];
  error: ReturnType<typeof useChat>['error'];
  stop: () => void;
  setMessages: ReturnType<typeof useChat>['setMessages'];
}

export function useChatTransport({
  conversationId,
  selectedModel,
  chatMode,
  user,
  setRateLimitState,
  showToastError,
  onSendAttempt,
}: UseChatTransportProps): UseChatTransportReturn {
  const conversationIdRef = useRef(conversationId);
  const selectedModelRef = useRef(selectedModel);
  const chatModeRef = useRef(chatMode);

  useEffect(() => {
    conversationIdRef.current = conversationId;
    selectedModelRef.current = selectedModel;
    chatModeRef.current = chatMode;
  }, [conversationId, selectedModel, chatMode]);

  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/chat',
      fetch: async (url, options) => {
        const response = await fetch(url, options);
        
        // If we get a 429 response, handle it here to trigger rate limit immediately
        if (response.status === 429) {
          try {
            const errorData = await response.clone().json();
            if (errorData?.rateLimitInfo) {
              const resetTime = errorData.rateLimitInfo.resetTime || 
                parseInt(response.headers.get('X-RateLimit-Reset') || '0', 10) || 
                Date.now() + 24 * 60 * 60 * 1000;
              const layer = errorData.rateLimitInfo.layer || 
                (response.headers.get('X-RateLimit-Layer') as 'redis' | 'database') || 
                'database';
              
              setRateLimitState({
                isRateLimited: true,
                resetTime,
                userType: user ? 'free' : 'guest',
                layer,
              });
              
              // Increment send attempt count so popup shows immediately
              onSendAttempt?.();
            }
          } catch {
            // JSON parse failed, let default error handling take over
          }
        }
        
        return response;
      },
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
  }, [user, setRateLimitState, onSendAttempt]);

  const handleError = useCallback(
    async (error: Error & { status?: number; cause?: any; response?: Response }) => {
      // Try to extract response from multiple sources
      let response: Response | null = null;
      
      if (error.response) {
        response = error.response;
      } else if (error.cause && error.cause instanceof Response) {
        response = error.cause;
      } else if (error.cause && typeof error.cause === 'object' && 'response' in error.cause) {
        response = (error.cause as any).response;
      }

      // If we have a response, try to parse the error body for rate limit info
      if (response && response.status === 429) {
        try {
          const errorData = await response.clone().json().catch(() => null);
          if (errorData?.rateLimitInfo) {
            const resetTime = errorData.rateLimitInfo.resetTime || 
              parseInt(response.headers.get('X-RateLimit-Reset') || '0', 10) || 
              Date.now() + 24 * 60 * 60 * 1000;
            const layer = errorData.rateLimitInfo.layer || 
              (response.headers.get('X-RateLimit-Layer') as 'redis' | 'database') || 
              'database';
            
            setRateLimitState({
              isRateLimited: true,
              resetTime,
              userType: user ? 'free' : 'guest',
              layer,
            });
            return;
          }
        } catch {
          // If JSON parsing fails, continue with header extraction
        }
      }

      // Check if it's a rate limit error (by status or message)
      if (isRateLimitError(error)) {
        const rateLimitInfo = extractRateLimitInfo(error);

        setRateLimitState({
          isRateLimited: true,
          resetTime: rateLimitInfo.resetTime,
          userType: user ? 'free' : 'guest',
          layer: rateLimitInfo.layer,
        });

        // Don't show toast for rate limit errors - popup will handle it
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
    stop: chatResult.stop,
    setMessages: chatResult.setMessages,
  };
}

