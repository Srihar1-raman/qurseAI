'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('contexts/RateLimitContext');

export interface RateLimitState {
  isRateLimited: boolean;
  resetTime: number | null;
  userType: 'guest' | 'free' | null;
  layer: 'redis' | 'database' | null;
}

interface RateLimitContextType {
  state: RateLimitState;
  setRateLimitState: (state: RateLimitState) => void;
  clearRateLimitState: () => void;
}

const RateLimitContext = createContext<RateLimitContextType | null>(null);

export function RateLimitProvider({ children }: { children: React.ReactNode }) {
  const { user, isProUser } = useAuth();
  const [state, setState] = useState<RateLimitState>({
    isRateLimited: false,
    resetTime: null,
    userType: null,
    layer: null,
  });

  // Track previous values to detect changes
  const previousUserRef = useRef<typeof user>(null);
  const previousIsProUserRef = useRef<boolean>(false);

  const setRateLimitState = useCallback((newState: RateLimitState) => {
    setState(newState);
  }, []);

  const clearRateLimitState = useCallback(() => {
    setState({
      isRateLimited: false,
      resetTime: null,
      userType: null,
      layer: null,
    });
  }, []);

  // Clear rate limit state when user authenticates (guest → authenticated)
  // This is necessary because limits change (10 → 20 messages)
  useEffect(() => {
    const previousUser = previousUserRef.current;
    previousUserRef.current = user;

    // User changed from null to a user object (guest → authenticated)
    if (!previousUser && user && state.isRateLimited) {
      logger.debug('User authenticated - clearing rate limit state', { userId: user.id });
      clearRateLimitState();
    }
  }, [user, state.isRateLimited, clearRateLimitState]);

  // Clear rate limit state when user upgrades to Pro (free → pro)
  // This is necessary because Pro users have unlimited messages
  useEffect(() => {
    const previousIsPro = previousIsProUserRef.current;
    previousIsProUserRef.current = isProUser;

    // isProUser changed from false to true (free → pro)
    if (!previousIsPro && isProUser && state.isRateLimited && state.userType === 'free') {
      logger.debug('User upgraded to Pro - clearing rate limit state', { userId: user?.id });
      clearRateLimitState();
    }
  }, [isProUser, state.isRateLimited, state.userType, user, clearRateLimitState]);

  // Auto-clear when reset time passes
  useEffect(() => {
    if (!state.isRateLimited || !state.resetTime) return;

    const now = Date.now();
    const timeUntilReset = state.resetTime - now;

    if (timeUntilReset <= 0) {
      // Reset time has passed, clear the rate limit state
      clearRateLimitState();
      return;
    }

    // Set up interval to check every second
    const interval = setInterval(() => {
      const currentTime = Date.now();
      if (currentTime >= state.resetTime!) {
        clearRateLimitState();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isRateLimited, state.resetTime, clearRateLimitState]);

  return (
    <RateLimitContext.Provider
      value={{
        state,
        setRateLimitState,
        clearRateLimitState,
      }}
    >
      {children}
    </RateLimitContext.Provider>
  );
}

export function useRateLimit() {
  const context = useContext(RateLimitContext);
  if (!context) {
    throw new Error('useRateLimit must be used within RateLimitProvider');
  }
  return context;
}

