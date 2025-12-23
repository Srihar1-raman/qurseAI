/**
 * Hook for managing conversation input
 * Handles input state, submission, and rate limit checking
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTextareaAutoResize } from './use-textarea-auto-resize';
import { useRateLimitCheck } from './use-rate-limit-check';
import type { UIMessagePart } from 'ai';

interface UseConversationInputProps {
  sendMessage: (message: { role: 'user'; parts: UIMessagePart<any, any>[] }) => void;
  isLoading: boolean;
  isRateLimited: boolean;
  onSendAttempt: () => void;
  onInteract: () => void;
  user: { id?: string } | null;
  setRateLimitState?: (state: { isRateLimited: boolean; resetTime: number; userType: 'guest' | 'free'; layer: 'redis' | 'database' }) => void;
}

interface UseConversationInputReturn {
  input: string;
  setInput: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleSubmit: (e: React.FormEvent) => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function useConversationInput({
  sendMessage,
  isLoading,
  isRateLimited,
  onSendAttempt,
  onInteract,
  user,
  setRateLimitState,
}: UseConversationInputProps): UseConversationInputReturn {
  const [input, setInput] = useState('');
  const [sendAttemptCount, setSendAttemptCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pre-flight rate limit check (read-only, does not increment)
  const { checkRateLimitBeforeSend, isChecking } = useRateLimitCheck({
    user,
    onRateLimitDetected: (status) => {
      // Update rate limit state immediately when quota exceeded
      setRateLimitState?.({
        isRateLimited: true,
        resetTime: status.resetTime,
        userType: user ? 'free' : 'guest',
        layer: status.layer as 'redis' | 'database',
      });
      // Trigger popup
      setSendAttemptCount((prev) => prev + 1);
      onSendAttempt();
    },
  });

  useTextareaAutoResize(textareaRef, input, {
    maxHeight: 200,
    minHeight: 48,
  });

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const sendMessageWithRateLimitCheck = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isLoading || isChecking) {
        return false;
      }

      // Check client-side state first (fast path) - if already rate limited, show popup
      if (isRateLimited) {
        setSendAttemptCount((prev) => prev + 1);
        onSendAttempt();
        return false;
      }

      // Pre-flight quota check (read-only) - prevents navigating to conversation page if already limited
      const canSend = await checkRateLimitBeforeSend();
      if (!canSend) {
        return false; // Rate limit popup already shown by onRateLimitDetected callback
      }

      setInput('');
      onInteract();

      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: messageText }] as UIMessagePart<any, any>[],
      });

      return true;
    },
    [isLoading, isRateLimited, isChecking, checkRateLimitBeforeSend, sendMessage, onSendAttempt, onInteract]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessageWithRateLimitCheck(input.trim());
    },
    [input, sendMessageWithRateLimitCheck]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessageWithRateLimitCheck(input.trim());
      }
    },
    [input, sendMessageWithRateLimitCheck]
  );

  return {
    input,
    setInput,
    textareaRef,
    handleSubmit,
    handleKeyPress,
  };
}

