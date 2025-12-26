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

/**
 * Streaming Error
 * Thrown when streaming operations fail
 */
export class StreamingError extends Error {
  statusCode: number = 500;
  
  constructor(
    message: string,
    public phase: 'initialization' | 'streaming' | 'completion'
  ) {
    super(message);
    this.name = 'StreamingError';
    Object.setPrototypeOf(this, StreamingError.prototype);
  }
}

/**
 * Provider Error
 * Thrown when AI provider operations fail
 * Includes retry information for error recovery
 */
export class ProviderError extends Error {
  statusCode: number = 502;
  
  constructor(
    message: string,
    public provider: string,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'ProviderError';
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}

/**
 * Validation Error
 * Thrown when request validation fails
 * Includes Zod validation errors for detailed feedback
 */
export class ValidationError extends Error {
  statusCode: number = 400;

  constructor(
    message: string,
    public validationErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Payment Error
 * Thrown when payment operations fail
 */
export class PaymentError extends Error {
  statusCode: number = 500;

  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'PaymentError';
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

/**
 * Checkout Error
 * Thrown when checkout session creation fails
 */
export class CheckoutError extends PaymentError {
  constructor(message: string) {
    super(message, 'CHECKOUT_ERROR');
    this.name = 'CheckoutError';
    this.statusCode = 500;
  }
}

/**
 * Webhook Error
 * Thrown when webhook processing fails
 */
export class WebhookError extends PaymentError {
  constructor(message: string) {
    super(message, 'WEBHOOK_ERROR');
    this.name = 'WebhookError';
    this.statusCode = 500;
  }
}


