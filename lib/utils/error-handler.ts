/**
 * Centralized Error Handler
 * Standardizes error handling across the application
 * Combines logging, sanitization, and user notification
 */

import { logger, createScopedLogger } from '@/lib/utils/logger';
import { sanitizeError, sanitizeApiError, sanitizeDbError } from '@/lib/utils/error-sanitizer';
import { ErrorMessages } from '@/lib/utils/error-messages';

/**
 * Handle any error with standardized processing
 * Logs the error, sanitizes the message, and returns user-friendly message
 */
export function handleError(
  error: unknown,
  context: string,
  options: {
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    includeContext?: boolean;
  } = {}
): string {
  const { logLevel = 'error', includeContext = true } = options;
  const scopedLogger = createScopedLogger(context);

  // Get sanitized user message
  const userMessage = sanitizeError(error);

  // Log the error with context
  const logContext = includeContext
    ? {
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : typeof error,
      }
    : {};

  switch (logLevel) {
    case 'debug':
      scopedLogger.debug('Error occurred', logContext);
      break;
    case 'info':
      scopedLogger.info('Error occurred', logContext);
      break;
    case 'warn':
      scopedLogger.warn('Error occurred', { ...logContext, error: error instanceof Error ? error.message : String(error) });
      break;
    case 'error':
    default:
      scopedLogger.error('Error occurred', error, logContext);
      break;
  }

  return userMessage;
}

/**
 * Handle API errors specifically
 * Includes additional API-specific sanitization
 */
export function handleApiError(
  error: unknown,
  context: string = 'api',
  options: {
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    includeContext?: boolean;
  } = {}
): string {
  const { logLevel = 'error', includeContext = true } = options;
  const scopedLogger = createScopedLogger(context);

  // Get sanitized API error message
  const userMessage = sanitizeApiError(error);

  // Log the error with context
  const logContext = includeContext
    ? {
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : typeof error,
      }
    : {};

  switch (logLevel) {
    case 'debug':
      scopedLogger.debug('API error occurred', logContext);
      break;
    case 'info':
      scopedLogger.info('API error occurred', logContext);
      break;
    case 'warn':
      scopedLogger.warn('API error occurred', { ...logContext, error: error instanceof Error ? error.message : String(error) });
      break;
    case 'error':
    default:
      scopedLogger.error('API error occurred', error, logContext);
      break;
  }

  return userMessage;
}

/**
 * Handle client-side errors
 * Returns sanitized message and optionally triggers toast notification
 * Note: This function doesn't directly call toast to avoid React hook dependencies
 * Components should use this and then call toast themselves
 */
export function handleClientError(
  error: unknown,
  context: string = 'client',
  options: {
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    includeContext?: boolean;
  } = {}
): string {
  const { logLevel = 'error', includeContext = true } = options;
  const scopedLogger = createScopedLogger(context);

  // Get sanitized user message
  const userMessage = sanitizeError(error);

  // Log the error with context
  const logContext = includeContext
    ? {
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : typeof error,
      }
    : {};

  switch (logLevel) {
    case 'debug':
      scopedLogger.debug('Client error occurred', logContext);
      break;
    case 'info':
      scopedLogger.info('Client error occurred', logContext);
      break;
    case 'warn':
      scopedLogger.warn('Client error occurred', { ...logContext, error: error instanceof Error ? error.message : String(error) });
      break;
    case 'error':
    default:
      scopedLogger.error('Client error occurred', error, logContext);
      break;
  }

  return userMessage;
}

/**
 * Handle database errors specifically
 * Includes database-specific sanitization
 */
export function handleDbError(
  error: unknown,
  context: string = 'db',
  options: {
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    includeContext?: boolean;
  } = {}
): string {
  const { logLevel = 'error', includeContext = true } = options;
  const scopedLogger = createScopedLogger(context);

  // Get sanitized database error message
  const userMessage = sanitizeDbError(error);

  // Log the error with context
  const logContext = includeContext
    ? {
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : typeof error,
      }
    : {};

  switch (logLevel) {
    case 'debug':
      scopedLogger.debug('Database error occurred', logContext);
      break;
    case 'info':
      scopedLogger.info('Database error occurred', logContext);
      break;
    case 'warn':
      scopedLogger.warn('Database error occurred', { ...logContext, error: error instanceof Error ? error.message : String(error) });
      break;
    case 'error':
    default:
      scopedLogger.error('Database error occurred', error, logContext);
      break;
  }

  return userMessage;
}

/**
 * Re-export error messages for convenience
 */
export { ErrorMessages } from '@/lib/utils/error-messages';

