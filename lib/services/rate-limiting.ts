/**
 * Rate Limiting Service
 * Business logic for enforcing rate limits on API usage
 */

import { countMessagesTodayServerSide } from '@/lib/db/queries.server';
import { isProUser } from '@/lib/services/subscription';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('services/rate-limiting');

/**
 * Rate limit configuration
 */
export const RATE_LIMITS = {
  anonymous: 2, // messages per day
  free: 10, // messages per day
  pro: Infinity, // unlimited
} as const;

/**
 * Check if user can send a message (rate limit check)
 * @param userId - User ID (null for anonymous users)
 * @param isProUserOverride - Optional: Pre-computed Pro status to avoid duplicate DB calls
 * @returns Object with allowed status, reason if denied, and remaining count
 */
export async function canSendMessage(
  userId: string | null,
  isProUserOverride?: boolean
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  try {
    // Anonymous users: 2 messages/day
    if (!userId) {
      // For anonymous users, we can't track by user_id
      // This would require IP-based tracking or session-based tracking
      // For now, we'll allow anonymous users (can be enhanced later with rate_limits table)
      logger.debug('Anonymous user rate limit check - allowing (not yet implemented)', {});
      return { allowed: true, remaining: RATE_LIMITS.anonymous };
    }

    // Check if user is Pro (unlimited)
    // Use override if provided to avoid duplicate DB calls
    const isPro = isProUserOverride !== undefined ? isProUserOverride : await isProUser(userId);

    if (isPro) {
      logger.debug('Pro user - unlimited messages', { userId });
      return { allowed: true };
    }

    // Free users: 10 messages/day
    const count = await countMessagesTodayServerSide(userId);
    const limit = RATE_LIMITS.free;

    if (count >= limit) {
      logger.warn('Rate limit exceeded', { userId, count, limit });
      return {
        allowed: false,
        reason: `Daily limit reached (${limit} messages). Upgrade to Pro for unlimited access.`,
        remaining: 0,
      };
    }

    const remaining = limit - count;
    logger.debug('Rate limit check passed', { userId, count, remaining });
    return { allowed: true, remaining };
  } catch (error) {
    logger.error('Error checking rate limit', error, { userId });
    // Fail open - allow message if rate limit check fails
    // This prevents blocking users due to system errors
    return { allowed: true };
  }
}

/**
 * Get rate limit information for a user
 * @param userId - User ID (null for anonymous users)
 * @returns Rate limit details
 */
export async function getRateLimitInfo(
  userId: string | null
): Promise<{
  limit: number;
  used: number;
  remaining: number;
  resetAt: Date;
}> {
  try {
    if (!userId) {
      return {
        limit: RATE_LIMITS.anonymous,
        used: 0, // Can't track anonymous users yet
        remaining: RATE_LIMITS.anonymous,
        resetAt: getTomorrow(),
      };
    }

    // Check if Pro
    const isPro = await isProUser(userId);

    if (isPro) {
      return {
        limit: Infinity,
        used: 0,
        remaining: Infinity,
        resetAt: getTomorrow(),
      };
    }

    // Free user
    const used = await countMessagesTodayServerSide(userId);
    const limit = RATE_LIMITS.free;

    return {
      limit,
      used,
      remaining: Math.max(0, limit - used),
      resetAt: getTomorrow(),
    };
  } catch (error) {
    logger.error('Error getting rate limit info', error, { userId });
    // Return safe defaults
    return {
      limit: RATE_LIMITS.free,
      used: 0,
      remaining: RATE_LIMITS.free,
      resetAt: getTomorrow(),
    };
  }
}

/**
 * Helper: Get tomorrow's date (midnight UTC)
 */
function getTomorrow(): Date {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}

