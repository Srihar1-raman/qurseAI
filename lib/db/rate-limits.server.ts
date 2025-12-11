import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('db/rate-limits');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase service credentials: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createSupabaseClient(supabaseUrl, serviceKey);

export interface RateLimitCheckResult {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  windowStart: Date;
  windowEnd: Date;
}

type CheckParams = {
  userId?: string | null;
  sessionHash?: string | null;
  resourceType?: string;
  limit: number;
  windowHours?: number;
};

export async function checkAndIncrementRateLimit(params: CheckParams): Promise<RateLimitCheckResult> {
  const {
    userId = null,
    sessionHash = null,
    resourceType = 'message',
    limit,
    windowHours = 24,
  } = params;

  const { data, error } = await supabase.rpc('increment_rate_limit', {
    p_user_id: userId,
    p_session_hash: sessionHash,
    p_resource_type: resourceType,
    p_limit: limit,
    p_window_hours: windowHours,
  });

  if (error) {
    logger.error('Rate limit check failed', error, { userId, sessionHash, resourceType, limit });
    const now = Date.now();
    return {
      allowed: true,
      count: 0,
      limit,
      remaining: limit,
      windowStart: new Date(now),
      windowEnd: new Date(now + windowHours * 60 * 60 * 1000),
    };
  }

  const result = data?.[0];

  if (!result) {
    logger.error('Rate limit RPC returned no data', { userId, sessionHash, resourceType, limit });
    const now = Date.now();
    return {
      allowed: true,
      count: 0,
      limit,
      remaining: limit,
      windowStart: new Date(now),
      windowEnd: new Date(now + windowHours * 60 * 60 * 1000),
    };
  }

  const remaining = Math.max(0, limit - result.count);

  return {
    allowed: !result.limit_reached,
    count: result.count,
    limit,
    remaining,
    windowStart: new Date(result.bucket_start),
    windowEnd: new Date(result.bucket_end),
  };
}

