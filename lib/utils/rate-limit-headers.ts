/**
 * Rate Limit Header Utilities
 * Helper functions for applying rate limit headers to responses
 */

/**
 * Apply rate limit headers to a Headers object
 * @param headers - Headers object to modify
 * @param rateLimitHeaders - Rate limit headers from checkRateLimit response
 * @param setCookieHeader - Optional Set-Cookie header from rate limit response
 */
export function applyRateLimitHeaders(
  headers: Headers,
  rateLimitHeaders: Record<string, string>,
  setCookieHeader?: string | null
): void {
  Object.entries(rateLimitHeaders).forEach(([key, value]) => headers.set(key, value));
  if (setCookieHeader) {
    headers.append('Set-Cookie', setCookieHeader);
  }
}

/**
 * Apply conversation ID header to a Headers object
 * @param headers - Headers object to modify
 * @param conversationId - Conversation ID to set in header
 */
export function applyConversationIdHeader(
  headers: Headers,
  conversationId?: string | null
): void {
  if (conversationId) {
    headers.set('X-Conversation-Id', conversationId);
  }
}

