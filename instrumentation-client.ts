import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,

  debug: process.env.NODE_ENV === 'development',

  environment: process.env.NODE_ENV || 'development',

  ignoreErrors: [
    'top.GLOBALS',
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    'atomicFindClose',
    'fb_xd_fragment',
    'bmi_SafeAddOnload',
    'EBCallBackMessageReceived',
    'conduitPage',
    'NetworkError',
    'Failed to fetch',
    'chrome-extension://',
  ],

  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^resource:\/\//i,
  ],

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
