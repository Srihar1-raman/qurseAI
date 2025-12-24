/**
 * Hook for managing context usage state
 * Tracks conversation context utilization from API responses
 */

'use client';

import { useState, useCallback } from 'react';
import type { ContextUsage } from '@/components/conversation/types';

interface UseContextUsageProps {
  /** Initial context usage state (loaded from storage) */
  initialUsage?: ContextUsage | null;
}

interface UseContextUsageReturn {
  /** Current context usage state */
  contextUsage: ContextUsage | null;
  /** Update context usage from API metadata */
  updateContextUsage: (metadata: {
    originalTokenCount: number;
    trimmedTokenCount: number;
    removedReasoningFrom: number;
    droppedMessages: number;
    warning?: string;
  }, model: string, modelContextWindow: number, messageCount: number) => void;
  /** Reset context usage state */
  resetContextUsage: () => void;
  /** Clear context usage (for new conversations) */
  clearContextUsage: () => void;
}

/**
 * Calculate percentage of context budget used
 */
function calculatePercentage(
  currentTokens: number,
  maxTokens: number
): number {
  if (maxTokens === 0) return 0;
  return Math.min(100, Math.round((currentTokens / maxTokens) * 100));
}

/**
 * Hook for managing context usage state
 */
export function useContextUsage({
  initialUsage = null,
}: UseContextUsageProps = {}): UseContextUsageReturn {
  const [contextUsage, setContextUsage] = useState<ContextUsage | null>(initialUsage);

  /**
   * Update context usage from API trimResult metadata
   */
  const updateContextUsage = useCallback((
    metadata: {
      originalTokenCount: number;
      trimmedTokenCount: number;
      removedReasoningFrom: number;
      droppedMessages: number;
      warning?: string;
    },
    model: string,
    modelContextWindow: number,
    messageCount: number
  ) => {
    // Calculate max tokens (75% budget)
    const maxTokens = Math.floor(modelContextWindow * 0.75);
    const currentTokens = metadata.trimmedTokenCount;
    const percentage = calculatePercentage(currentTokens, maxTokens);

    const newUsage: ContextUsage = {
      percentage,
      currentTokens,
      maxTokens,
      modelContextWindow,
      messagesKept: messageCount,
      messagesDropped: metadata.droppedMessages,
      reasoningRemoved: metadata.removedReasoningFrom,
      warning: metadata.warning,
      model,
    };

    setContextUsage(newUsage);
  }, []);

  /**
   * Reset to initial state
   */
  const resetContextUsage = useCallback(() => {
    setContextUsage(initialUsage);
  }, [initialUsage]);

  /**
   * Clear context usage (for new conversations)
   */
  const clearContextUsage = useCallback(() => {
    setContextUsage(null);
  }, []);

  return {
    contextUsage,
    updateContextUsage,
    resetContextUsage,
    clearContextUsage,
  };
}
