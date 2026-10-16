import type { LogEntry } from './types';

interface SentryClient {
  captureException?: (err: unknown, ctx?: { tags?: Record<string, string>; extra?: Record<string, unknown> }) => void;
  captureMessage?: (msg: string, ctx?: { level?: string; tags?: Record<string, string>; extra?: Record<string, unknown> }) => void;
}

/**
 * Safely forwards errors or critical log entries to Sentry without throwing.
 */
export function captureToSentry(entry: LogEntry, errorObj?: Error | unknown): void {
  try {
    const globalObj = globalThis as unknown as { Sentry?: SentryClient };
    const sentry = globalObj.Sentry;
    if (!sentry) return;

    const tags: Record<string, string> = {
      service: entry.service ?? 'default',
      level: entry.level,
    };

    if (errorObj && typeof sentry.captureException === 'function') {
      sentry.captureException(errorObj, {
        tags,
        extra: entry.metadata,
      });
    } else if (entry.level === 'error' && typeof sentry.captureMessage === 'function') {
      sentry.captureMessage(entry.message, {
        level: 'error',
        tags,
        extra: entry.metadata,
      });
    }
  } catch {
    // Sentry transport failure must never interrupt application execution
  }
}
