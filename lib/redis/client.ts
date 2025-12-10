import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('redis/client');

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error(
    'Missing Upstash Redis environment variables. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
  );
}

export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

// Primary limiter: 10/day per IP
export const ipRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '24 h'),
  prefix: '@upstash/ratelimit:unauth',
  analytics: true,
});

// Unknown-IP limiter: stricter 3/day
export const unknownIpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '24 h'),
  prefix: '@upstash/ratelimit:unauth:unknown',
  analytics: true,
});

logger.debug('Upstash Redis client and rate limiters initialized');

