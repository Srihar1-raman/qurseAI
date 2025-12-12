import 'server-only';

import { checkGuestRateLimitIP } from '@/lib/redis/rate-limit';
import { checkAndIncrementRateLimit } from '@/lib/db/rate-limits.server';
import { getClientIp } from '@/lib/utils/ip-extraction';
import { getOrCreateSessionId } from '@/lib/utils/session';
import { hmacSessionId } from '@/lib/utils/session-hash';
import { createScopedLogger } from '@/lib/utils/logger';
import type { RateLimitCheckResult } from '@/lib/types';

const logger = createScopedLogger('services/rate-limiting-guest');

export async function checkGuestRateLimit(request: Request): Promise<RateLimitCheckResult> {
  const ip = getClientIp(request);
  const sessionId = getOrCreateSessionId(request);
  const sessionHash = hmacSessionId(sessionId);

  // Layer 1: Redis IP-based check
  const redisCheck = await checkGuestRateLimitIP(ip);

  if (!redisCheck.allowed) {
    logger.debug('Guest rate limit exceeded (redis)', { ip });
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

  // Layer 2: Database session-hash check
  const dbCheck = await checkAndIncrementRateLimit({
    sessionHash,
    resourceType: 'message',
    limit: 10,
    windowHours: 24,
  });

  if (!dbCheck.allowed) {
    logger.debug('Guest rate limit exceeded (db)', {
      ip,
      count: dbCheck.count,
      limit: dbCheck.limit,
    });
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

  logger.debug('Guest rate limit check passed', {
    ip,
    remaining: dbCheck.remaining,
    count: dbCheck.count,
  });

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

