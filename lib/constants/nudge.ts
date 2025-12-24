/**
 * Guest save nudge configuration constants
 */

export const NUDGE_CONFIG = {
  // Trigger conditions
  MESSAGES_THRESHOLD: 3, // Show after 3rd message
  ACTIVE_TIME_MS: 2 * 60 * 1000, // 2 minutes of active chatting

  // Frequency capping
  MAX_PER_SESSION: 1, // Max 1 nudge per session
  MAX_PER_30_MINUTES: 1, // Max 1 nudge per 30 minutes
  MAX_LIFETIME: 3, // Max 3 nudges ever
  DISMISS_DURATION_MS: 24 * 60 * 60 * 1000, // 24 hours

  // Session detection
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes without activity = new session

  // UI
  ANIMATION_DURATION_MS: 300, // Slide-in animation duration
} as const;

export type NudgeTriggerReason = 'message_count' | 'active_time' | 'title_generated';

export const NUDGE_MESSAGES = {
  DEFAULT: {
    title: 'Sign in to save this conversation',
    message: 'Create an account to save your conversations and access them later.',
  },
  AFTER_MESSAGES: {
    title: 'Enjoying the conversation?',
    message: 'Sign in to save it and continue where you left off on any device.',
  },
  AFTER_ACTIVE_TIME: {
    title: "You've been chatting for a while",
    message: 'Sign in to save this conversation before you lose it.',
  },
  AFTER_TITLE_GENERATED: {
    title: 'Great conversation started!',
    message: 'Sign in to save this conversation and access it anytime.',
  },
} as const;
