/**
 * Read-only rate limit check (does not increment counters)
 * Used for status checks without affecting rate limit state
 */

import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createScopedLogger } from '@/lib/utils/logger';
import type { RateLimitDbResult } from './rate-limits.server';

const logger = createScopedLogger('db/rate-limits-readonly');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase service credentials: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createSupabaseClient(supabaseUrl, serviceKey);

type ReadOnlyCheckParams = {
  userId?: string | null;
  sessionHash?: string | null;
  resourceType?: string;
  limit: number;
  windowHours?: number;
};

/**
 * Check rate limit status without incrementing (read-only)
 * Returns current count and limit status
 */
export async function checkRateLimitStatusReadOnly(params: ReadOnlyCheckParams): Promise<RateLimitDbResult> {
  const {
    userId = null,
    sessionHash = null,
    resourceType = 'message',
    limit,
    windowHours = 24,
  } = params;

  // Calculate bucket start/end (same logic as increment function)
  // Use date_trunc('day', NOW()) equivalent in JavaScript
  const now = new Date();
  const bucketStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));
  const bucketEnd = new Date(bucketStart);
  bucketEnd.setTime(bucketStart.getTime() + windowHours * 60 * 60 * 1000);

  // Query current count without incrementing
  let query = supabase
    .from('rate_limits')
    .select('count, bucket_start, bucket_end')
    .eq('resource_type', resourceType)
    .eq('bucket_start', bucketStart.toISOString());

  if (userId) {
    query = query.eq('user_id', userId).is('session_hash', null);
  } else if (sessionHash) {
    query = query.eq('session_hash', sessionHash).is('user_id', null);
  } else {
    // No identifier - return allowed
    return {
      allowed: true,
      count: 0,
      limit,
      remaining: limit,
      windowStart: bucketStart,
      windowEnd: bucketEnd,
    };
  }

  const { data, error } = await query.maybeSingle();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    logger.error('Rate limit read-only check failed', error, { userId, sessionHash, resourceType, limit });
    // Fail open on error
    return {
      allowed: true,
      count: 0,
      limit,
      remaining: limit,
      windowStart: bucketStart,
      windowEnd: bucketEnd,
    };
  }

  // No record found = not rate limited
  if (!data) {
    return {
      allowed: true,
      count: 0,
      limit,
      remaining: limit,
      windowStart: bucketStart,
      windowEnd: bucketEnd,
    };
  }

  const currentCount = data.count || 0;
  const remaining = Math.max(0, limit - currentCount);
  const limitReached = currentCount >= limit;

  return {
    allowed: !limitReached,
    count: currentCount,
    limit,
    remaining,
    windowStart: new Date(data.bucket_start),
    windowEnd: new Date(data.bucket_end),
  };
}

