/**
 * User-Friendly Error Message Mappings
 * Maps technical errors to user-friendly messages
 */

/**
 * Get user-friendly error message from error code or message
 */
export function getUserFriendlyMessage(
  error: unknown,
  defaultMessage: string = 'Something went wrong. Please try again or contact support.'
): string {
  if (!error) {
    return defaultMessage;
  }

  let message: string;
  if (error instanceof Error) {
    message = error.message.toLowerCase();
  } else if (typeof error === 'string') {
    message = error.toLowerCase();
  } else {
    return defaultMessage;
  }

  // API Key errors
  if (message.includes('api key') || message.includes('api_key')) {
    return 'Service configuration error. Please contact support.';
  }

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

  // Database errors
  if (
    message.includes('database') ||
    message.includes('constraint') ||
    message.includes('violation')
  ) {
    return 'This action cannot be completed. Please try again.';
  }

  // Validation errors (handled by Zod, but fallback)
  if (message.includes('validation') || message.includes('invalid')) {
    return 'Invalid input. Please check your data and try again.';
  }

  // Authentication errors
  if (message.includes('unauthorized') || message.includes('authentication')) {
    return 'Authentication required. Please sign in and try again.';
  }

  // Not found errors
  if (message.includes('not found') || message.includes('404')) {
    return 'The requested resource was not found.';
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('429')) {
    return 'Too many requests. Please wait a moment and try again.';
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

  return defaultMessage;
}

/**
 * Common error messages for different scenarios
 */
export const ErrorMessages = {
  NETWORK_ERROR: 'Connection failed. Please check your internet and try again.',
  VALIDATION_ERROR: 'Invalid input. Please check your data and try again.',
  DATABASE_ERROR: 'Database error occurred. Please try again.',
  AUTH_ERROR: 'Authentication required. Please sign in and try again.',
  NOT_FOUND: 'The requested resource was not found.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  SERVER_ERROR: 'Server error occurred. Please try again later or contact support.',
  CONFIG_ERROR: 'Service configuration error. Please contact support.',
  GENERIC: 'Something went wrong. Please try again or contact support.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  DUPLICATE_ENTRY: 'This item already exists. Please try again.',
} as const;

