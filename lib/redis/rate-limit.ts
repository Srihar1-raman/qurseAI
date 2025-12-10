import { ipRateLimit, unknownIpRateLimit } from '@/lib/redis/client';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('redis/rate-limit');

export interface GuestRateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
  degraded?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function checkGuestRateLimitIP(ip: string): Promise<GuestRateLimitResult> {
  const isUnknown = ip === 'unknown';
  const limiter = isUnknown ? unknownIpRateLimit : ipRateLimit;
  const identifier = isUnknown ? 'ip:unknown' : `ip:${ip}`;

  try {
    const result = await limiter.limit(identifier);
    return {
      allowed: result.success,
      remaining: result.remaining,
      reset: result.reset,
      degraded: undefined,
    };
  } catch (error) {
    logger.warn('Redis unavailable, allowing request (degraded)', { error, ip });
    const fallbackRemaining = isUnknown ? 3 : 10;
    return {
      allowed: true,
      remaining: fallbackRemaining,
      reset: Date.now() + DAY_MS,
      degraded: true,
    };
  }
}

