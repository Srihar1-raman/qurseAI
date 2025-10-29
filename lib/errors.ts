/**
 * Custom Error Classes
 * Infrastructure-level error handling for AI chat system
 * Provides proper error types with status codes for API responses
 */

/**
 * Model Access Error
 * Thrown when user attempts to access a model without proper authorization
 */
export class ModelAccessError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.name = 'ModelAccessError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ModelAccessError.prototype);
  }
}

/**
 * Rate Limit Error
 * Infrastructure hook for future rate limiting business logic
 * Thrown when user exceeds rate limits (enforcement logic added later)
 */
export class RateLimitError extends Error {
  statusCode: number = 429;

  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Chat Mode Error
 * Thrown when an invalid or non-existent chat mode is requested
 */
export class ChatModeError extends Error {
  statusCode: number = 400;

  constructor(message: string = 'Invalid chat mode') {
    super(message);
    this.name = 'ChatModeError';
    Object.setPrototypeOf(this, ChatModeError.prototype);
  }
}

