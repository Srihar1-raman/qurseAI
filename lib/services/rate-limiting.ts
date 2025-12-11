import 'server-only';

import { checkGuestRateLimit } from './rate-limiting-guest';
import { checkAuthenticatedRateLimit } from './rate-limiting-auth';
import { setSessionIdCookie } from '@/lib/utils/session';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('services/rate-limiting');

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  remaining: number;
  reset: number;
  headers: Record<string, string>;
  sessionId?: string;
}

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
 */
export async function checkRateLimit(params: CheckRateLimitParams): Promise<RateLimitResult> {
  const { userId, isProUser, request, response } = params;

  // Guest: hybrid flow
<<<<<<< Current (Your changes)
<<<<<<< Current (Your changes)
  if (!userId) {
=======
    if (!userId) {
>>>>>>> Incoming (Background Agent changes)
=======
    if (!userId) {
>>>>>>> Incoming (Background Agent changes)
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

