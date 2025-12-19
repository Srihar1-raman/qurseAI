import { useState, useCallback } from 'react';
import type { ShareConversationResponse } from '@/lib/types';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('hooks/use-share-conversation');

export function useShareConversation() {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const shareConversation = useCallback(async (
    conversationId: string
  ): Promise<ShareConversationResponse> => {
    setIsSharing(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to share conversation' }));
        throw new Error(errorData.error || 'Failed to share conversation');
      }

      const data: ShareConversationResponse = await response.json();
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to share conversation');
      setError(error);
      logger.error('Error sharing conversation', error, { conversationId });
      throw error;
    } finally {
      setIsSharing(false);
    }
  }, []);

  const unshareConversation = useCallback(async (
    conversationId: string
  ): Promise<void> => {
    setIsSharing(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/unshare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to unshare conversation' }));
        throw new Error(errorData.error || 'Failed to unshare conversation');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to unshare conversation');
      setError(error);
      logger.error('Error unsharing conversation', error, { conversationId });
      throw error;
    } finally {
      setIsSharing(false);
    }
  }, []);

  return {
    shareConversation,
    unshareConversation,
    isSharing,
    error,
  };
}

