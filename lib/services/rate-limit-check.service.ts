/**
 * Rate Limiting Check Service
 * Handles rate limiting for chat API
 */

import { NextResponse } from 'next/server';
import { checkRateLimit } from './rate-limiting';
import { hmacSessionId } from '@/lib/utils/session-hash';
import { applyRateLimitHeaders, applyConversationIdHeader } from '@/lib/utils/rate-limit-headers';
import type { User } from '@/lib/types';

/**
 * Result of rate limit check
 */
export interface RateLimitCheckResult {
  /** Session ID from rate limit check */
  sessionId?: string;
  /** Hashed session ID for guest operations */
  sessionHash?: string;
  /** Rate limit headers to apply to response */
  rateLimitHeaders: {
    headers: Record<string, string>;
    setCookieHeader: string | null;
  };
  /** Early response if rate limit exceeded */
  earlyResponse?: NextResponse;
}

/**
 * Check rate limits for chat request
 *
 * @param req - Incoming request
 * @param user - Authenticated user (null for guests)
 * @param conversationId - Conversation ID for header application
 * @returns Rate limit check result with session info or early response
 */
export async function checkRateLimits(
  req: Request,
  user: User | null,
  conversationId: string | undefined
): Promise<RateLimitCheckResult> {
  const rateLimitResponse = new Response();

  const rateLimitCheck = await checkRateLimit({
    userId: user?.id || null,
    isProUser: false, // TODO: Implement isProUser check
    request: req,
    response: rateLimitResponse,
  });

  const setCookieHeader = rateLimitResponse.headers.get('set-cookie');

  // Early return if rate limit exceeded
  if (!rateLimitCheck.allowed) {
    const denyResponse = NextResponse.json(
      {
        error: rateLimitCheck.reason || 'Rate limit exceeded',
        rateLimitInfo: {
          remaining: rateLimitCheck.remaining ?? 0,
          resetTime: rateLimitCheck.reset,
          layer: rateLimitCheck.headers['X-RateLimit-Layer'] || 'database',
        },
      },
      { status: 429 }
    );
    applyRateLimitHeaders(denyResponse.headers, rateLimitCheck.headers, setCookieHeader);
    applyConversationIdHeader(denyResponse.headers, conversationId);

    return {
      rateLimitHeaders: {
        headers: rateLimitCheck.headers,
        setCookieHeader,
      },
      earlyResponse: denyResponse,
    };
  }

  const sessionId = rateLimitCheck.sessionId;
  const sessionHash = sessionId ? hmacSessionId(sessionId) : undefined;

  return {
    sessionId,
    sessionHash,
    rateLimitHeaders: {
      headers: rateLimitCheck.headers,
      setCookieHeader,
    },
  };
}
