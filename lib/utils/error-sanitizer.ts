/**
 * Error Sanitization Utility
 * Converts raw errors to safe, user-friendly messages
 * Prevents leaking internal details, stack traces, or sensitive information
 */

/**
 * Sanitize any error to a safe user message
 * Never exposes stack traces, file paths, or sensitive data
 */
export function sanitizeError(error: unknown): string {
  // Handle null/undefined
  if (!error) {
    return 'Something went wrong. Please try again or contact support.';
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Never expose stack traces
    if (message.includes('stack') || message.includes('trace')) {
      return 'Something went wrong. Please try again or contact support.';
    }

    // Never expose internal paths or file names
    if (
      message.includes('/') ||
      message.includes('\\') ||
      message.includes('.ts') ||
      message.includes('.js') ||
      message.includes('file:')
    ) {
      return 'Something went wrong. Please try again or contact support.';
    }

    // Never expose API keys, tokens, or credentials
    if (
      message.includes('api key') ||
      message.includes('api_key') ||
      message.includes('token') ||
      message.includes('secret') ||
      message.includes('password') ||
      message.includes('credential')
    ) {
      return 'Service configuration error. Please contact support.';
    }

    // Never expose database internals
    if (
      message.includes('supabase') ||
      message.includes('postgres') ||
      message.includes('database') ||
      message.includes('relation') ||
      message.includes('table') ||
      message.includes('column')
    ) {
      return 'Database error occurred. Please try again or contact support.';
    }

    // Check for common error patterns and sanitize
    return sanitizeCommonErrors(message);
  }

  // Handle string errors
  if (typeof error === 'string') {
    return sanitizeCommonErrors(error.toLowerCase());
  }

  // Handle objects with message property
  if (typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message).toLowerCase();
    return sanitizeCommonErrors(message);
  }

  // Unknown error type
  return 'Something went wrong. Please try again or contact support.';
}

/**
 * Sanitize API-specific errors
 * Includes additional checks for API error patterns
 */
export function sanitizeApiError(error: unknown): string {
  if (!error) {
    return 'API request failed. Please try again or contact support.';
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    ) {
      return 'Connection failed. Please check your internet and try again.';
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('429')) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    // Authentication/authorization
    if (
      message.includes('unauthorized') ||
      message.includes('401') ||
      message.includes('forbidden') ||
      message.includes('403')
    ) {
      return 'Authentication required. Please sign in and try again.';
    }

    // Not found
    if (message.includes('not found') || message.includes('404')) {
      return 'Resource not found. Please check and try again.';
    }

    // Server errors
    if (
      message.includes('server error') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503')
    ) {
      return 'Server error occurred. Please try again later or contact support.';
    }

    // Provider-specific errors (AI service errors)
    if (
      message.includes('provider') ||
      message.includes('model') ||
      message.includes('ai') ||
      message.includes('openai') ||
      message.includes('groq') ||
      message.includes('xai')
    ) {
      return 'AI service error. Please try again or contact support.';
    }
  }

  // Fallback to general sanitization
  return sanitizeError(error);
}

/**
 * Sanitize database-specific errors
 * Includes checks for database error patterns
 */
export function sanitizeDbError(error: unknown): string {
  if (!error) {
    return 'Database error occurred. Please try again.';
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Constraint violations
    if (
      message.includes('unique') ||
      message.includes('duplicate') ||
      message.includes('violates') ||
      message.includes('constraint')
    ) {
      return 'This action cannot be completed. The item may already exist or be invalid.';
    }

    // Foreign key violations
    if (message.includes('foreign key') || message.includes('reference')) {
      return 'This action cannot be completed. Related data is invalid.';
    }

    // Not found
    if (message.includes('not found') || message.includes('does not exist')) {
      return 'The requested item was not found.';
    }

    // Permission errors
    if (
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('access denied') ||
      message.includes('row-level security') ||
      message.includes('rls')
    ) {
      return 'You do not have permission to perform this action.';
    }

    // Connection errors
    if (
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('network')
    ) {
      return 'Database connection failed. Please try again.';
    }
  }

  // Fallback to general sanitization
  return sanitizeError(error);
}

/**
 * Sanitize common error patterns
 * Maps common error messages to user-friendly versions
 */
function sanitizeCommonErrors(message: string): string {
  // Validation errors (should be handled by Zod, but just in case)
  if (message.includes('validation') || message.includes('invalid')) {
    return 'Invalid input. Please check your data and try again.';
  }

  // Network/connection errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('timeout')
  ) {
    return 'Connection failed. Please check your internet and try again.';
  }

  // Generic fallback
  return 'Something went wrong. Please try again or contact support.';
}

