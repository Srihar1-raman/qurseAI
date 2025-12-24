/**
 * Hook for managing guest "Sign in to Save" nudge
 * Implements professional UX timing and frequency capping
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { safeGet, safeSet } from '@/lib/utils/localStorage';
import { NUDGE_CONFIG, NUDGE_MESSAGES, type NudgeTriggerReason } from '@/lib/constants/nudge';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('hooks/use-guest-save-nudge');

interface UseGuestSaveNudgeOptions {
  messageCount: number;
  conversationId?: string;
  isActive?: boolean; // Is user actively chatting
}

interface NudgeState {
  shouldShow: boolean;
  triggerReason: NudgeTriggerReason | null;
  dismissUntil: number | null;
}

export function useGuestSaveNudge({
  messageCount,
  conversationId,
  isActive = true,
}: UseGuestSaveNudgeOptions) {
  const { user } = useAuth();
  const [nudgeState, setNudgeState] = useState<NudgeState>({
    shouldShow: false,
    triggerReason: null,
    dismissUntil: null,
  });

  // Session tracking
  const sessionStartTimeRef = useRef<number>(Date.now());
  const lastActivityTimeRef = useRef<number>(Date.now());
  const activeTimeAccumulatedRef = useRef<number>(0);
  const hasShownThisSessionRef = useRef<boolean>(false);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update activity timestamp
  useEffect(() => {
    if (!isActive) return;

    lastActivityTimeRef.current = Date.now();
  }, [isActive, messageCount]);

  // Session management: Check for session timeout
  useEffect(() => {
    sessionCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityTimeRef.current;

      // If no activity for > 30 minutes, consider it a new session
      if (timeSinceActivity > NUDGE_CONFIG.SESSION_TIMEOUT_MS) {
        hasShownThisSessionRef.current = false;
        sessionStartTimeRef.current = now;
        activeTimeAccumulatedRef.current = 0;
        logger.debug('New session detected (timeout)');
      }

      // Accumulate active time (if user is active)
      if (isActive && timeSinceActivity < 60000) { // Active in last minute
        activeTimeAccumulatedRef.current += 10000; // Add 10 seconds per check
      }
    }, 10000); // Check every 10 seconds

    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
    };
  }, [isActive]);

  // Check if nudge should be dismissed
  const isDismissed = useCallback((): boolean => {
    const lastDismissed = safeGet<number>('guest_nudge_last_dismissed', 0);
    const now = Date.now();

    if (lastDismissed && (now - lastDismissed) < NUDGE_CONFIG.DISMISS_DURATION_MS) {
      return true;
    }

    return false;
  }, []);

  // Check frequency capping
  const checkFrequencyCap = useCallback((): boolean => {
    const lastShown = safeGet<number>('guest_nudge_last_shown', 0);
    const lifetimeCount = safeGet<number>('guest_nudge_lifetime_count', 0);
    const now = Date.now();

    // Cap 1: Max 1 per session
    if (hasShownThisSessionRef.current) {
      logger.debug('Frequency cap: Already shown this session');
      return false;
    }

    // Cap 2: Max 1 per 30 minutes
    if (lastShown && (now - lastShown) < NUDGE_CONFIG.MAX_PER_30_MINUTES * 60 * 1000) {
      logger.debug('Frequency cap: Shown less than 30 minutes ago');
      return false;
    }

    // Cap 3: Max 3 lifetime
    if (lifetimeCount >= NUDGE_CONFIG.MAX_LIFETIME) {
      logger.debug('Frequency cap: Lifetime limit reached');
      return false;
    }

    return true;
  }, []);

  // Record nudge shown
  const recordNudgeShown = useCallback((triggerReason: NudgeTriggerReason) => {
    const now = Date.now();
    const sessionCount = safeGet<number>('guest_nudge_session_count', 0);
    const lifetimeCount = safeGet<number>('guest_nudge_lifetime_count', 0);

    safeSet('guest_nudge_last_shown', now);
    safeSet('guest_nudge_session_count', sessionCount + 1);
    safeSet('guest_nudge_lifetime_count', lifetimeCount + 1);

    hasShownThisSessionRef.current = true;

    logger.info('Nudge shown', {
      triggerReason,
      sessionCount: sessionCount + 1,
      lifetimeCount: lifetimeCount + 1,
    });
  }, []);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    const now = Date.now();
    safeSet('guest_nudge_last_dismissed', now);

    setNudgeState({
      shouldShow: false,
      triggerReason: null,
      dismissUntil: now + NUDGE_CONFIG.DISMISS_DURATION_MS,
    });

    logger.info('Nudge dismissed', {
      dismissUntil: now + NUDGE_CONFIG.DISMISS_DURATION_MS,
    });
  }, []);

  // Check triggers
  useEffect(() => {
    // Only for guest users
    if (user?.id) {
      setNudgeState({ shouldShow: false, triggerReason: null, dismissUntil: null });
      return;
    }

    // Don't show if dismissed recently
    if (isDismissed()) {
      return;
    }

    // Check frequency caps
    if (!checkFrequencyCap()) {
      return;
    }

    let triggerReason: NudgeTriggerReason | null = null;

    // Trigger 1: Message count threshold
    if (messageCount >= NUDGE_CONFIG.MESSAGES_THRESHOLD) {
      triggerReason = 'message_count';
    }

    // Trigger 2: Active time threshold
    if (activeTimeAccumulatedRef.current >= NUDGE_CONFIG.ACTIVE_TIME_MS) {
      triggerReason = 'active_time';
    }

    if (triggerReason) {
      recordNudgeShown(triggerReason);
      setNudgeState({
        shouldShow: true,
        triggerReason,
        dismissUntil: null,
      });
    }
  }, [user, messageCount, isDismissed, checkFrequencyCap, recordNudgeShown]);

  // External trigger for title-generated event
  const triggerFromTitle = useCallback(() => {
    if (user?.id) return;
    if (isDismissed()) return;
    if (!checkFrequencyCap()) return;

    recordNudgeShown('title_generated');
    setNudgeState({
      shouldShow: true,
      triggerReason: 'title_generated',
      dismissUntil: null,
    });
  }, [user, isDismissed, checkFrequencyCap, recordNudgeShown]);

  // Get message content based on trigger
  const getMessageContent = useCallback(() => {
    switch (nudgeState.triggerReason) {
      case 'message_count':
        return NUDGE_MESSAGES.AFTER_MESSAGES;
      case 'active_time':
        return NUDGE_MESSAGES.AFTER_ACTIVE_TIME;
      case 'title_generated':
        return NUDGE_MESSAGES.AFTER_TITLE_GENERATED;
      default:
        return NUDGE_MESSAGES.DEFAULT;
    }
  }, [nudgeState.triggerReason]);

  return {
    shouldShow: nudgeState.shouldShow,
    onDismiss: handleDismiss,
    triggerFromTitle,
    getMessageContent,
  };
}
