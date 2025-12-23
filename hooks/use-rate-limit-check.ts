/**
 * Hook for pre-flight rate limit checking
 * Checks quota status before user sends a message to prevent rate limit popup after send
 */

import { useState, useCallback, useRef } from 'react';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('hooks/use-rate-limit-check');

interface RateLimitStatus {
  isRateLimited: boolean;
  remaining: number;
  resetTime: number;
  layer: string;
  limit: string;
}

interface UseRateLimitCheckProps {
  user: { id?: string } | null;
  onRateLimitDetected?: (status: RateLimitStatus) => void;
}

interface UseRateLimitCheckReturn {
  checkRateLimitBeforeSend: () => Promise<boolean>;
  isChecking: boolean;
  lastCheckTime: number;
  invalidateCache: () => void;
}

// Cache duration: 30 seconds (don't spam the API)
const CACHE_DURATION = 30 * 1000;

export function useRateLimitCheck({
  user,
  onRateLimitDetected,
}: UseRateLimitCheckProps): UseRateLimitCheckReturn {
  const [isChecking, setIsChecking] = useState(false);
  const lastCheckTimeRef = useRef(0);
  const cachedStatusRef = useRef<RateLimitStatus | null>(null);

  const checkRateLimitBeforeSend = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckTimeRef.current;

    // Use cached status if fresh (within 30 seconds)
    if (cachedStatusRef.current && timeSinceLastCheck < CACHE_DURATION) {
      const status = cachedStatusRef.current;
      if (status.isRateLimited) {
        logger.debug('Rate limit detected (cached)', { remaining: status.remaining, layer: status.layer });
        onRateLimitDetected?.(status);
        return false;
      }
      return true;
    }

    // Fetch fresh status from server
    setIsChecking(true);
    try {
      const response = await fetch('/api/rate-limit/status');
      if (!response.ok) {
        logger.warn('Rate limit check failed, assuming not rate limited', { status: response.status });
        return true; // Fail open - allow sending
      }

      const status: RateLimitStatus = await response.json();

      // Cache the result
      cachedStatusRef.current = status;
      lastCheckTimeRef.current = now;

      if (status.isRateLimited) {
        logger.debug('Rate limit detected (fresh check)', { remaining: status.remaining, layer: status.layer });
        onRateLimitDetected?.(status);
        return false;
      }

      logger.debug('Rate limit check passed', { remaining: status.remaining });
      return true;
    } catch (error) {
      logger.error('Error checking rate limit status', error);
      return true; // Fail open - allow sending on error
    } finally {
      setIsChecking(false);
    }
  }, [onRateLimitDetected]);

  const invalidateCache = useCallback(() => {
    cachedStatusRef.current = null;
    lastCheckTimeRef.current = 0;
  }, []);

  return {
    checkRateLimitBeforeSend,
    isChecking,
    lastCheckTime: lastCheckTimeRef.current,
    invalidateCache,
  };
}
