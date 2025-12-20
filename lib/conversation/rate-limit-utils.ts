/**
 * Rate Limit Utility Functions
 * Handles detection and extraction of rate limit information from errors
 */

export interface RateLimitInfo {
  resetTime: number;
  layer: 'redis' | 'database';
}

/**
 * Check if an error is a rate limit error
 * @param error - Error object that may contain rate limit information
 * @returns True if the error is a rate limit error (status 429)
 */
export function isRateLimitError(
  error: Error & { status?: number; cause?: unknown; response?: Response }
): boolean {
  // Check status code directly
  if (error.status === 429) {
    return true;
  }

  // Check response status if available
  if (error.response && error.response.status === 429) {
    return true;
  }

  // Check cause response status
  if (error.cause && error.cause instanceof Response && error.cause.status === 429) {
    return true;
  }

  // Check error message for rate limit indicators
  const message = error.message?.toLowerCase() || '';
  if (
    message.includes('rate limit') || 
    message.includes('429') ||
    message.includes('daily limit') ||
    message.includes('limit reached') ||
    message.includes('upgrade to pro')
  ) {
    return true;
  }

  // Check if error has rateLimitInfo in the error object or cause
  if (error.cause && typeof error.cause === 'object') {
    const cause = error.cause as Record<string, unknown>;
    const errorMessage = typeof cause.error === 'string' ? cause.error : String(cause.error || '');
    if (cause.rateLimitInfo || errorMessage.includes('limit')) {
      return true;
    }
  }

  return false;
}

/**
 * Extract rate limit information from an error
 * Reads reset time and layer from response headers
 * @param error - Rate limit error with response headers
 * @returns Rate limit information (resetTime, layer)
 */
export function extractRateLimitInfo(
  error: Error & { status?: number; cause?: unknown; response?: Response }
): RateLimitInfo {
  // Default values
  let resetTime = Date.now() + 24 * 60 * 60 * 1000; // Default: 24 hours from now
  let layer: 'redis' | 'database' = 'database';

  // Try multiple sources for the response object
  let response: Response | null = null;
  
  if (error.response) {
    response = error.response;
  } else if (error.cause && error.cause instanceof Response) {
    response = error.cause as Response;
  } else if (error.cause && typeof error.cause === 'object' && 'response' in error.cause) {
    const causeWithResponse = error.cause as { response?: Response };
    if (causeWithResponse.response) {
      response = causeWithResponse.response;
    }
  }

  // Extract from response headers
  if (response) {
    const resetHeader = response.headers.get('X-RateLimit-Reset');
    const layerHeader = response.headers.get('X-RateLimit-Layer');

    if (resetHeader) {
      const parsed = parseInt(resetHeader, 10);
      if (!isNaN(parsed)) {
        resetTime = parsed;
      }
    }

    if (layerHeader === 'redis' || layerHeader === 'database') {
      layer = layerHeader;
    }
  }

  return {
    resetTime,
    layer,
  };
}

