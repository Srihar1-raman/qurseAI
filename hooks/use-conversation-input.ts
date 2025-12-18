/**
 * Hook for managing conversation input
 * Handles input state, submission, and rate limit checking
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTextareaAutoResize } from './use-textarea-auto-resize';
import type { UIMessagePart } from 'ai';

interface UseConversationInputProps {
  sendMessage: (message: { role: 'user'; parts: UIMessagePart<any, any>[] }) => void;
  isLoading: boolean;
  isRateLimited: boolean;
  onSendAttempt: () => void;
  onInteract: () => void;
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
}: UseConversationInputProps): UseConversationInputReturn {
  const [input, setInput] = useState('');
  const [sendAttemptCount, setSendAttemptCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    (messageText: string) => {
      if (!messageText.trim() || isLoading) {
        return false;
      }

      if (isRateLimited) {
        setSendAttemptCount((prev) => prev + 1);
        onSendAttempt();
        return false;
      }

      setInput('');
      onInteract();

      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: messageText }] as UIMessagePart<any, any>[],
      });

      return true;
    },
    [isLoading, isRateLimited, sendMessage, onSendAttempt, onInteract]
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

