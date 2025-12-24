/**
 * Context Management Configuration
 *
 * Environment variables for controlling how conversation context is trimmed
 * to fit within model context windows.
 */

export const CONTEXT_CONFIG = {
  /** Percentage of model's context window to use (leaves room for response) */
  BUDGET_PERCENT: Number(process.env.CONTEXT_BUDGET_PERCENT) || 75,

  /** Number of most recent messages to keep reasoning content for */
  KEEP_REASONING_COUNT: Number(process.env.KEEP_REASONING_COUNT) || 3,

  /** Minimum number of messages to always keep (even when over budget) */
  MIN_MESSAGES_KEEP: Number(process.env.MIN_MESSAGES_KEEP) || 5,

  /** Maximum single message character length before warning on client */
  MAX_SINGLE_MESSAGE_CHARS: Number(process.env.MAX_SINGLE_MESSAGE_CHARS) || 50000,
} as const;
