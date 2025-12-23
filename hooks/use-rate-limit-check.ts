/**
 * Hook for pre-flight rate limit checking
 * Checks if user is already rate limited BEFORE sending message
 * Does NOT increment counter - only reads current status
 * NO CACHING - always fresh data to avoid race conditions
 */

import { useState, useCallback } from 'react';
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
}

export function useRateLimitCheck({
  user,
  onRateLimitDetected,
}: UseRateLimitCheckProps): UseRateLimitCheckReturn {
  const [isChecking, setIsChecking] = useState(false);

  const checkRateLimitBeforeSend = useCallback(async (): Promise<boolean> => {
    // Always fetch fresh status from server (read-only, does not increment)
    // No caching to avoid race conditions where quota changes between checks
    setIsChecking(true);
    try {
      const response = await fetch('/api/rate-limit/status');
      if (!response.ok) {
        logger.warn('Rate limit check failed, assuming not rate limited', { status: response.status });
        return true; // Fail open - allow sending
      }

      const status: RateLimitStatus = await response.json();

      if (status.isRateLimited) {
        logger.debug('Rate limit detected', { remaining: status.remaining, layer: status.layer });
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

  return {
    checkRateLimitBeforeSend,
    isChecking,
  };
}
