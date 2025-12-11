import 'server-only';

import { checkAndIncrementRateLimit } from '@/lib/db/rate-limits.server';
import { isProUser } from '@/lib/services/subscription';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('services/rate-limiting-auth');

export interface AuthRateLimitResult {
  allowed: boolean;
  reason?: string;
  remaining: number;
  reset: number;
  headers: Record<string, string>;
}

export async function checkAuthenticatedRateLimit(
  userId: string,
  isProUserOverride?: boolean
): Promise<AuthRateLimitResult> {
  const isPro = isProUserOverride !== undefined ? isProUserOverride : await isProUser(userId);

  // Pro users: track only
  if (isPro) {
    const dbCheck = await checkAndIncrementRateLimit({
      userId,
      resourceType: 'message',
      limit: 999999,
      windowHours: 24,
    });

    logger.debug('Pro user rate limit (tracking only)', { userId, count: dbCheck.count });

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

  // Free users
  const dbCheck = await checkAndIncrementRateLimit({
    userId,
    resourceType: 'message',
    limit: 20,
    windowHours: 24,
  });

  if (!dbCheck.allowed) {
    logger.warn('Free user rate limit exceeded', {
      userId,
      count: dbCheck.count,
      limit: dbCheck.limit,
    });

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

  logger.debug('Free user rate limit check passed', {
    userId,
    count: dbCheck.count,
    remaining: dbCheck.remaining,
  });

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

