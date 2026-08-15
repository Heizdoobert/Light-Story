import * as Sentry from '@sentry/nextjs';


const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && dsn) {
    // ponytail: Next dev attaches per-request close listeners to ServerResponse
    // (count stable at 11, not a leak); raise Node's warn threshold to silence.
    (await import('node:http')).ServerResponse.prototype.setMaxListeners(20);
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
