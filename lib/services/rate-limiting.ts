import 'server-only';

import { checkGuestRateLimit } from './rate-limiting-guest';
import { checkAuthenticatedRateLimit } from './rate-limiting-auth';
import { setSessionIdCookie } from '@/lib/utils/session';
import { createScopedLogger } from '@/lib/utils/logger';
import type { RateLimitCheckResult } from '@/lib/types';

const logger = createScopedLogger('services/rate-limiting');

type CheckRateLimitParams = {
  userId?: string | null;
  isProUser?: boolean;
  request: Request;
  response?: Response;
};

/**
 * Hybrid rate limit orchestrator
 * - Guests: Redis IP (layer 1) + DB session_hash (layer 2)
 * - Auth users: DB (layer 2) with Pro/Free handling
 * 
 * Admin bypass: Set RATE_LIMIT_BYPASS=true in .env.local (dev/staging only)
 */
export async function checkRateLimit(params: CheckRateLimitParams): Promise<RateLimitCheckResult> {
  const { userId, isProUser, request, response } = params;

  // Admin bypass (dev/staging only)
  const bypassEnabled = process.env.RATE_LIMIT_BYPASS === 'true';
  if (bypassEnabled && process.env.NODE_ENV !== 'production') {
    logger.warn('Rate limit bypass enabled (dev/staging only)', { userId: userId || 'guest' });
    return {
      allowed: true,
      remaining: 999999,
      reset: Date.now() + 24 * 60 * 60 * 1000,
      headers: {
        'X-RateLimit-Limit': 'unlimited',
        'X-RateLimit-Remaining': 'unlimited',
        'X-RateLimit-Reset': (Date.now() + 24 * 60 * 60 * 1000).toString(),
        'X-RateLimit-Layer': 'bypass',
      },
      sessionId: userId ? undefined : crypto.randomUUID(),
    };
  }

  // Guest: hybrid flow
  if (!userId) {
    const guestResult = await checkGuestRateLimit(request);

    // Set session cookie before streaming starts
    if (response && guestResult.sessionId) {
      setSessionIdCookie(response, guestResult.sessionId);
    }

    return guestResult;
  }

  // Authenticated
  const authResult = await checkAuthenticatedRateLimit(userId, isProUser);

  logger.debug('Authenticated rate limit evaluated', {
    userId,
    remaining: authResult.remaining,
    reset: authResult.reset,
  });

  return authResult;
}

