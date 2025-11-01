/**
 * Sentry Server Configuration
 * Error tracking for server-side errors (API routes, server components)
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Initialize Sentry for server-side
 * Runs in Node.js environment (API routes, server components)
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust sample rate for production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Set environment
  environment: process.env.NODE_ENV || 'development',

  // Filter out known non-critical errors
  ignoreErrors: [
    // Next.js specific
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
    // Network errors that are handled
    'ECONNREFUSED',
    'ENOTFOUND',
  ],

  // Capture unhandled promise rejections
  captureUnhandledRejections: true,

  // Server-specific integrations
  integrations: [],

  // Release tracking (can be set via env var)
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
});

