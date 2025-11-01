/**
 * Structured Logging Utility
 * Industry-standard logging with levels, timestamps, and environment awareness
 * Integrates with Sentry for error tracking in production
 */

// Sentry integration (optional, only if DSN is configured)
// Safely import Sentry - it will be available if configured in sentry.client.config.ts or sentry.server.config.ts
let Sentry: typeof import('@sentry/nextjs') | null = null;
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    // Try to import Sentry (will work if sentry config files are loaded)
    Sentry = require('@sentry/nextjs');
  } catch {
    // Sentry not available or not configured, continue without it
    Sentry = null;
  }
}

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  enableTimestamp: boolean;
  enableContext: boolean;
}

/**
 * Log entry structure
 */
interface LogEntry {
  level: string;
  message: string;
  timestamp?: string;
  context?: Record<string, unknown>;
  error?: Error;
}

/**
 * Get current log level based on environment
 */
function getDefaultLogLevel(): LogLevel {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return LogLevel.INFO; // Skip DEBUG in production
  }
  return LogLevel.DEBUG; // Enable all logs in development
}

/**
 * Format timestamp for logs
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format log message with structured data
 */
function formatLogEntry(entry: LogEntry): string {
  const parts: string[] = [];
  
  if (entry.timestamp) {
    parts.push(`[${entry.timestamp}]`);
  }
  
  parts.push(`[${entry.level.toUpperCase()}]`);
  parts.push(entry.message);
  
  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context));
  }
  
  if (entry.error) {
    parts.push(`\nError: ${entry.error.message}`);
    if (entry.error.stack && typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      parts.push(`\nStack: ${entry.error.stack}`);
    }
  }
  
  return parts.join(' ');
}

/**
 * Main Logger Class
 */
class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: getDefaultLogLevel(),
      enableTimestamp: true,
      enableContext: true,
      ...config,
    };
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    levelName: string,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level: levelName,
      message,
      ...(this.config.enableTimestamp && { timestamp: formatTimestamp() }),
      ...(this.config.enableContext && context && { context }),
      ...(error && { error }),
    };

    const formatted = formatLogEntry(entry);

    // Output to appropriate console method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  /**
   * Debug level - Development only
   * Use for detailed debugging information
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, 'debug', message, context);
  }

  /**
   * Info level - Important events
   * Use for informational messages about application flow
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, 'info', message, context);
  }

  /**
   * Warn level - Warnings
   * Use for potentially problematic situations
   * Adds breadcrumb to Sentry if configured
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, 'warn', message, context);
    
    // Add breadcrumb to Sentry if available
    if (Sentry && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        Sentry.addBreadcrumb({
          message,
          level: 'warning',
          data: context,
        });
      } catch {
        // Sentry not available or failed
      }
    }
  }

  /**
   * Error level - Errors
   * Use for error conditions that should be investigated
   * Also sends to Sentry if configured
   */
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const errorObj = error instanceof Error ? error : undefined;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullMessage = errorObj ? `${message}: ${errorMessage}` : message;
    
    // Log to console
    this.log(LogLevel.ERROR, 'error', fullMessage, context, errorObj);
    
    // Send to Sentry if available and DSN is configured
    if (Sentry && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        if (errorObj) {
          // Capture exception with context
          Sentry.captureException(errorObj, {
            tags: {
              logger: 'true',
            },
            contexts: {
              logger: {
                message,
                ...context,
              },
            },
          });
        } else {
          // Capture message with context
          Sentry.captureMessage(fullMessage, {
            level: 'error',
            tags: {
              logger: 'true',
            },
            contexts: {
              logger: {
                ...context,
              },
            },
          });
        }
        
        // Add breadcrumb for context
        if (context && Object.keys(context).length > 0) {
          Sentry.addBreadcrumb({
            message: fullMessage,
            level: 'error',
            data: context,
          });
        }
      } catch (sentryError) {
        // Sentry failed, but don't break logging
        console.error('Failed to send error to Sentry:', sentryError);
      }
    }
  }
}

/**
 * Default logger instance
 * Export singleton for use throughout the application
 */
export const logger = new Logger();

/**
 * Create a scoped logger with default context
 * Useful for component or module-specific logging
 */
export function createScopedLogger(scope: string, defaultContext?: Record<string, unknown>) {
  return {
    debug: (message: string, context?: Record<string, unknown>) => {
      logger.debug(`[${scope}] ${message}`, { ...defaultContext, ...context });
    },
    info: (message: string, context?: Record<string, unknown>) => {
      logger.info(`[${scope}] ${message}`, { ...defaultContext, ...context });
    },
    warn: (message: string, context?: Record<string, unknown>) => {
      logger.warn(`[${scope}] ${message}`, { ...defaultContext, ...context });
    },
    error: (message: string, error?: Error | unknown, context?: Record<string, unknown>) => {
      logger.error(`[${scope}] ${message}`, error, { ...defaultContext, ...context });
    },
  };
}

