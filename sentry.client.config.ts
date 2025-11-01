/**
 * Sentry Client Configuration
 * Error tracking for client-side errors
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Initialize Sentry for client-side
 * Only runs in browser environment
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust sample rate for production (1.0 = 100% of errors, lower in production)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Set sample rate for session replay
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Sample 100% of sessions when session has an error
  replaysOnErrorSampleRate: 1.0,

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Set environment
  environment: process.env.NODE_ENV || 'development',

  // Filter out known non-critical errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    'atomicFindClose',
    'fb_xd_fragment',
    'bmi_SafeAddOnload',
    'EBCallBackMessageReceived',
    'conduitPage',
    // Network errors that are handled
    'NetworkError',
    'Failed to fetch',
    // Chrome extension errors
    'chrome-extension://',
  ],

  // Filter out specific error messages
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    // Firefox extensions
    /^resource:\/\//i,
  ],

  // Capture unhandled promise rejections
  captureUnhandledRejections: true,

  // Integrate with browser integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content and user input
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Release tracking (can be set via env var)
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
});

