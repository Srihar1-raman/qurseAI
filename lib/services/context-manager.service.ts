import { getModelConfig } from '@/ai/models';
import { countConversationTokens, countMessageTokens } from '@/lib/utils/token-counter';
import { CONTEXT_CONFIG } from '@/lib/utils/context/constants';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('lib/services/context-manager');

/**
 * Context trim result
 */
export interface ContextTrimResult {
  messages: Array<any>;
  metadata: {
    originalTokenCount: number;
    trimmedTokenCount: number;
    removedReasoningFrom: number;
    droppedMessages: number;
    warning?: string;
  };
}

/**
 * Smart context trimming
 *
 * Strategy:
 * 1. If under budget, return as-is
 * 2. Remove reasoning from messages beyond KEEP_REASONING_COUNT
 * 3. Drop oldest messages if still over budget (but keep MIN_MESSAGES_KEEP)
 */
export function trimContext(
  messages: Array<any>,
  model: string
): ContextTrimResult {
  const modelConfig = getModelConfig(model);
  const maxTokens = modelConfig?.contextWindow || 128000;
  const budgetTokens = Math.floor(maxTokens * (CONTEXT_CONFIG.BUDGET_PERCENT / 100));

  const originalCount = countConversationTokens(messages, model);

  logger.debug('trimContext: Starting', {
    model,
    maxTokens,
    budgetTokens,
    originalCount,
    messageCount: messages.length,
  });

  // If under budget, return as-is
  if (originalCount <= budgetTokens) {
    logger.debug('trimContext: Under budget, no trimming needed');
    return {
      messages,
      metadata: {
        originalTokenCount: originalCount,
        trimmedTokenCount: originalCount,
        removedReasoningFrom: 0,
        droppedMessages: 0,
      },
    };
  }

  // Deep clone to avoid mutating original
  let workingMessages = JSON.parse(JSON.stringify(messages));
  let removedReasoningFrom = 0;
  let droppedMessages = 0;

  // Step 1: Remove reasoning from messages beyond KEEP_REASONING_COUNT
  const reasoningCutoffIndex = Math.max(
    0,
    workingMessages.length - CONTEXT_CONFIG.KEEP_REASONING_COUNT
  );

  logger.debug('trimContext: Removing old reasoning', {
    reasoningCutoffIndex,
    totalMessages: workingMessages.length,
    keepReasoningCount: CONTEXT_CONFIG.KEEP_REASONING_COUNT,
  });

  for (let i = 0; i < reasoningCutoffIndex; i++) {
    const msg = workingMessages[i];
    if (msg.parts && Array.isArray(msg.parts)) {
      const hadReasoning = msg.parts.some((p: any) => p.type === 'reasoning');
      msg.parts = msg.parts.filter((p: any) => p.type !== 'reasoning');

      if (hadReasoning && msg.parts.length === 0) {
        // If message only had reasoning, remove it entirely
        workingMessages.splice(i, 1);
        i--; // Adjust index after removal
        removedReasoningFrom++;
      } else if (hadReasoning) {
        removedReasoningFrom++;
      }
    }
  }

  let newCount = countConversationTokens(workingMessages, model);

  logger.debug('trimContext: After reasoning removal', {
    newCount,
    removedReasoningFrom,
    remainingMessages: workingMessages.length,
  });

  // Step 2: If still over budget, drop oldest messages (but keep MIN_MESSAGES_KEEP)
  if (newCount > budgetTokens) {
    const minKeep = Math.min(CONTEXT_CONFIG.MIN_MESSAGES_KEEP, workingMessages.length);

    logger.debug('trimContext: Still over budget, dropping oldest messages', {
      minKeep,
      currentCount: newCount,
      budget: budgetTokens,
    });

    // Try removing messages from start until under budget
    while (workingMessages.length > minKeep && newCount > budgetTokens) {
      const removed = workingMessages.shift()!;
      const removedTokens = countMessageTokens(removed, model);
      newCount -= removedTokens;
      droppedMessages++;

      logger.debug('trimContext: Dropped message', {
        droppedMessages,
        removedTokens,
        remainingCount: newCount,
      });
    }
  }

  const warning = generateWarning(originalCount, newCount, maxTokens);

  logger.info('trimContext: Complete', {
    model,
    originalCount,
    trimmedCount: newCount,
    budgetTokens,
    removedReasoningFrom,
    droppedMessages,
    finalMessageCount: workingMessages.length,
    warning,
  });

  return {
    messages: workingMessages,
    metadata: {
      originalTokenCount: originalCount,
      trimmedTokenCount: newCount,
      removedReasoningFrom,
      droppedMessages,
      warning,
    },
  };
}

/**
 * Generate user-friendly warning message
 */
function generateWarning(
  original: number,
  trimmed: number,
  maxTokens: number
): string | undefined {
  if (trimmed < original) {
    const percentage = Math.round((trimmed / original) * 100);
    return `Conversation condensed to ${percentage}% of original size to fit context window.`;
  }

  // If still over budget after aggressive trimming
  if (trimmed > maxTokens * 0.9) {
    return 'Conversation is very long. Consider starting a new conversation for best results.';
  }

  return undefined;
}

/**
 * Get token usage statistics
 */
export function getTokenStats(
  messages: Array<any>,
  model: string
): { total: number; byMessage: Array<{ index: number; tokens: number }> } {
  const byMessage = messages.map((msg, index) => ({
    index,
    tokens: countMessageTokens(msg, model),
  }));

  const total = byMessage.reduce((sum, stat) => sum + stat.tokens, 0);

  return { total, byMessage };
}
