import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && dsn) {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge' && dsn) {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
    });
  }
}
