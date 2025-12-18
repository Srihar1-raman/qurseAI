/**
 * Rate limit utility functions for error handling
 * Extracts rate limit information from API errors
 */

import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('conversation/rate-limit-utils');

/**
 * Error type that may contain rate limit information
 */
interface RateLimitError extends Error {
  status?: number;
  response?: Response;
  cause?: {
    headers?: Headers;
  };
}

/**
 * Rate limit information extracted from error
 */
export interface RateLimitInfo {
  resetTime: number;
  layer: 'redis' | 'database';
  extractedFrom: string;
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as RateLimitError;
  const errorMessage = err.message || '';
  const errorLower = errorMessage.toLowerCase();

  if (err.status === 429) {
    return true;
  }

  if (errorLower.includes('rate limit') || errorLower.includes('daily limit')) {
    return true;
  }

  if (errorMessage.includes('rateLimitInfo')) {
    return true;
  }

  try {
    const parsedError = JSON.parse(errorMessage);
    if (parsedError) {
      return (
        parsedError.error?.toLowerCase().includes('daily limit') ||
        parsedError.error?.toLowerCase().includes('rate limit') ||
        parsedError.rateLimitInfo !== undefined
      );
    }
  } catch {
    // Not JSON, continue
  }

  return false;
}

/**
 * Extract rate limit headers from Response object
 */
function extractFromHeaders(headers: Headers): { resetTime: number | null; layer: 'redis' | 'database' } {
  const reset = headers.get('X-RateLimit-Reset');
  const layerHeader = headers.get('X-RateLimit-Layer');

  return {
    resetTime: reset ? parseInt(reset, 10) : null,
    layer: (layerHeader as 'redis' | 'database') || 'database',
  };
}

/**
 * Calculate fallback reset time based on layer type
 */
function calculateResetTimeFallback(layer: 'redis' | 'database'): number {
  const now = Date.now();

  if (layer === 'database') {
    const utcNow = new Date();
    const utcMidnight = new Date(
      Date.UTC(
        utcNow.getUTCFullYear(),
        utcNow.getUTCMonth(),
        utcNow.getUTCDate() + 1,
        0,
        0,
        0,
        0
      )
    );
    return utcMidnight.getTime();
  }

  return now + 24 * 60 * 60 * 1000;
}

/**
 * Extract rate limit information from error
 * Tries multiple sources: response headers, error cause, then fallback calculation
 */
export function extractRateLimitInfo(error: RateLimitError): RateLimitInfo {
  let resetTime: number | null = null;
  let layer: 'redis' | 'database' = 'database';
  let extractedFrom = 'none';

  if (error.response && error.response instanceof Response) {
    const result = extractFromHeaders(error.response.headers);
    if (result.resetTime) {
      resetTime = result.resetTime;
      layer = result.layer;
      extractedFrom = 'response.headers';
    } else if (result.layer) {
      layer = result.layer;
    }
  }

  if (!resetTime && error.cause && typeof error.cause === 'object' && 'headers' in error.cause) {
    const headers = (error.cause as { headers: Headers }).headers;
    const result = extractFromHeaders(headers);
    if (result.resetTime) {
      resetTime = result.resetTime;
      layer = result.layer;
      extractedFrom = 'error.cause.headers';
    } else if (result.layer) {
      layer = result.layer;
    }
  }

  if (!resetTime) {
    resetTime = calculateResetTimeFallback(layer);
    extractedFrom = layer === 'database' ? 'fallback.database.midnight-utc' : 'fallback.redis.24h-from-now';
    logger.debug('Rate limit reset time not found in headers, using fallback', {
      layer,
      resetTime,
      extractedFrom,
      errorStatus: error.status,
    });
  } else {
    logger.debug('Rate limit reset time extracted from headers', {
      layer,
      resetTime,
      extractedFrom,
    });
  }

  return {
    resetTime,
    layer,
    extractedFrom,
  };
}

