/**
 * Read-only rate limit check service
 * Checks rate limit status without incrementing counters
 * Used for status checks on app load
 */

import 'server-only';

import { checkGuestRateLimitIP } from '@/lib/redis/rate-limit';
import { checkRateLimitStatusReadOnly } from '@/lib/db/rate-limits-readonly.server';
import { getClientIp } from '@/lib/utils/ip-extraction';
import { getOrCreateSessionId } from '@/lib/utils/session';
import { hmacSessionId } from '@/lib/utils/session-hash';
import { isProUser } from '@/lib/services/subscription';
import { createScopedLogger } from '@/lib/utils/logger';
import type { RateLimitCheckResult } from '@/lib/types';

const logger = createScopedLogger('services/rate-limiting-readonly');

type CheckRateLimitReadOnlyParams = {
  userId?: string | null;
  isProUser?: boolean;
  request: Request;
};

/**
 * Check rate limit status without incrementing (read-only)
 * Returns current status for pre-flight checks
 */
export async function checkRateLimitReadOnly(params: CheckRateLimitReadOnlyParams): Promise<RateLimitCheckResult> {
  const { userId, isProUser: isProUserOverride, request } = params;

  // Admin bypass (dev/staging only)
  const bypassEnabled = process.env.RATE_LIMIT_BYPASS === 'true';
  if (bypassEnabled && process.env.NODE_ENV !== 'production') {
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
    };
  }

  // Guest: check Redis IP first (read-only)
  if (!userId) {
    const ip = getClientIp(request);
    const sessionId = getOrCreateSessionId(request);
    const sessionHash = hmacSessionId(sessionId);

    // Layer 1: Redis IP-based check (read-only)
    const redisCheck = await checkGuestRateLimitIP(ip);

    if (!redisCheck.allowed) {
      return {
        allowed: false,
        reason: 'Daily limit reached (10 messages). Sign in for more.',
        remaining: 0,
        reset: redisCheck.reset,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': redisCheck.reset.toString(),
          'X-RateLimit-Layer': 'redis',
          ...(redisCheck.degraded ? { 'X-RateLimit-Degraded': 'true' } : {}),
        },
        sessionId,
      };
    }

    // Layer 2: Database session-hash check (read-only)
    const dbCheck = await checkRateLimitStatusReadOnly({
      sessionHash,
      resourceType: 'message',
      limit: 10,
      windowHours: 24,
    });

    if (!dbCheck.allowed) {
      return {
        allowed: false,
        reason: 'Daily limit reached (10 messages). Sign in for more.',
        remaining: 0,
        reset: dbCheck.windowEnd.getTime(),
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': dbCheck.windowEnd.getTime().toString(),
          'X-RateLimit-Layer': 'database',
          ...(redisCheck.degraded ? { 'X-RateLimit-Degraded': 'true' } : {}),
        },
        sessionId,
      };
    }

    return {
      allowed: true,
      remaining: dbCheck.remaining,
      reset: dbCheck.windowEnd.getTime(),
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': dbCheck.remaining.toString(),
        'X-RateLimit-Reset': dbCheck.windowEnd.getTime().toString(),
        'X-RateLimit-Layer': 'database',
        ...(redisCheck.degraded ? { 'X-RateLimit-Degraded': 'true' } : {}),
      },
      sessionId,
    };
  }

  // Authenticated: check database (read-only)
  const isPro = isProUserOverride !== undefined ? isProUserOverride : await isProUser(userId);

  if (isPro) {
    // Pro users: always allowed
    const dbCheck = await checkRateLimitStatusReadOnly({
      userId,
      resourceType: 'message',
      limit: 999999,
      windowHours: 24,
    });

    return {
      allowed: true,
      remaining: Number.POSITIVE_INFINITY,
      reset: dbCheck.windowEnd.getTime(),
      headers: {
        'X-RateLimit-Limit': 'unlimited',
        'X-RateLimit-Remaining': 'unlimited',
        'X-RateLimit-Reset': dbCheck.windowEnd.getTime().toString(),
        'X-RateLimit-Layer': 'database',
      },
    };
  }

  // Free users: check database (read-only)
  const dbCheck = await checkRateLimitStatusReadOnly({
    userId,
    resourceType: 'message',
    limit: 20,
    windowHours: 24,
  });

  if (!dbCheck.allowed) {
    return {
      allowed: false,
      reason: `Daily limit reached (${dbCheck.limit} messages). Upgrade to Pro for unlimited access.`,
      remaining: 0,
      reset: dbCheck.windowEnd.getTime(),
      headers: {
        'X-RateLimit-Limit': dbCheck.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': dbCheck.windowEnd.getTime().toString(),
        'X-RateLimit-Layer': 'database',
      },
    };
  }

  return {
    allowed: true,
    remaining: dbCheck.remaining,
    reset: dbCheck.windowEnd.getTime(),
    headers: {
      'X-RateLimit-Limit': dbCheck.limit.toString(),
      'X-RateLimit-Remaining': dbCheck.remaining.toString(),
      'X-RateLimit-Reset': dbCheck.windowEnd.getTime().toString(),
      'X-RateLimit-Layer': 'database',
    },
  };
}

