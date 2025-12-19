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
  const hasCheckedOnMountRef = useRef(false);

  const setRateLimitState = useCallback((newState: RateLimitState) => {
    setState(prevState => {
      // Only update if state actually changed to prevent unnecessary re-renders
      if (
        prevState.isRateLimited === newState.isRateLimited &&
        prevState.resetTime === newState.resetTime &&
        prevState.userType === newState.userType &&
        prevState.layer === newState.layer
      ) {
        return prevState; // No change, return previous state
      }
      return newState;
    });
  }, []);

  const clearRateLimitState = useCallback(() => {
    setState(prevState => {
      // Only update if state actually changed
      if (!prevState.isRateLimited) {
        return prevState; // Already cleared
      }
      return {
        isRateLimited: false,
        resetTime: null,
        userType: null,
        layer: null,
      };
    });
  }, []);

  // Clear rate limit state when user authenticates (guest → authenticated)
  // This is necessary because limits change (10 → 20 messages)
  useEffect(() => {
    const previousUser = previousUserRef.current;
    previousUserRef.current = user;

    // User changed from null to a user object (guest → authenticated)
    if (!previousUser && user && state.isRateLimited) {
      clearRateLimitState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only depend on user - check state inside effect

  // Clear rate limit state when user upgrades to Pro (free → pro)
  // This is necessary because Pro users have unlimited messages
  useEffect(() => {
    const previousIsPro = previousIsProUserRef.current;
    previousIsProUserRef.current = isProUser;

    // isProUser changed from false to true (free → pro)
    if (!previousIsPro && isProUser && state.isRateLimited && state.userType === 'free') {
      clearRateLimitState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProUser]); // Only depend on isProUser - check state inside effect

  // Pre-flight check: Check rate limit status on app load
  useEffect(() => {
    // Only check once on mount - don't re-run on user changes
    if (hasCheckedOnMountRef.current) return;
    hasCheckedOnMountRef.current = true;

    const checkRateLimitStatus = async () => {
      try {
        const response = await fetch('/api/rate-limit/status', {
          method: 'GET',
          credentials: 'include', // Include cookies for session
        });

        if (!response.ok) {
          return; // Silently fail - don't log to avoid console spam
        }

        const data = await response.json();

        if (data.isRateLimited) {
          // Get current user value at time of API response (not closure)
          const currentUser = user;
          setState({
            isRateLimited: true,
            resetTime: data.resetTime,
            userType: currentUser ? 'free' : 'guest',
            layer: data.layer || 'database',
          });
        }
      } catch (error) {
        // Fail silently - don't log to avoid console spam
      }
    };

    // Run immediately - lightweight check won't block render
    checkRateLimitStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

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

