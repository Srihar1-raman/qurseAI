import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.NODE_ENV === 'development',
      environment: process.env.NODE_ENV || 'development',
      ignoreErrors: [
        'NEXT_NOT_FOUND',
        'NEXT_REDIRECT',
        'ECONNREFUSED',
        'ENOTFOUND',
      ],
      integrations: [],
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
