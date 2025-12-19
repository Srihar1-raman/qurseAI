/**
 * Rate Limit Status API Route
 * GET /api/rate-limit/status
 * Returns current rate limit status
 * Used for pre-flight checks on app load
 * Note: This increments the rate limit counter (acceptable for one-time check)
 */

import { NextResponse } from 'next/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import { checkRateLimitReadOnly } from '@/lib/services/rate-limiting-readonly';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('api/rate-limit/status');

export async function GET(request: Request) {
  try {
    const { lightweightUser } = await getUserData();

    // Check rate limit status (read-only, does not increment)
    const rateLimitCheck = await checkRateLimitReadOnly({
      userId: lightweightUser?.userId || null,
      isProUser: lightweightUser?.isProUser,
      request,
    });

    return NextResponse.json({
      isRateLimited: !rateLimitCheck.allowed,
      remaining: rateLimitCheck.remaining ?? 0,
      resetTime: rateLimitCheck.reset,
      layer: rateLimitCheck.headers['X-RateLimit-Layer'] || 'database',
      limit: rateLimitCheck.headers['X-RateLimit-Limit'] || '0',
    });
  } catch (error) {
    logger.error('Error checking rate limit status', error);
    // On error, assume not rate limited (fail open)
    return NextResponse.json({
      isRateLimited: false,
      remaining: 999,
      resetTime: Date.now() + 24 * 60 * 60 * 1000,
      layer: 'database',
      limit: '0',
    });
  }
}

