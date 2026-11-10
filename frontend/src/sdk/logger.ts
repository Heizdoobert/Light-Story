import { redactMetadata } from './logger/redact/redactMetadata';
import { captureToSentry } from './logger/sentry/sentryTransport';
import { persistLogToSupabase } from './logger/supabase/supabaseTransport';
import type { LogEntry, LogLevel, LoggerPayloadOptions } from './logger/types/loggerTypes';

// Simple logger with level management compatible with loglevel API used in tests
const isDev = process.env.NODE_ENV === 'development';

export const levels = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
} as const;

export type LevelKey = keyof typeof levels;

let currentLevel: number = isDev ? levels.DEBUG : levels.ERROR;

export function setLevel(level: LevelKey | number): void {
  if (typeof level === 'string') {
    const lvl = levels[level as LevelKey];
    if (lvl !== undefined) currentLevel = lvl;
  } else {
    currentLevel = level;
  }
}

export function getLevel(): number {
  return currentLevel;
}

function shouldLog(level: number): boolean {
  return level >= currentLevel;
}

function normalizeLogEntry(
  level: LogLevel,
  messageOrObj: unknown,
  optionsOrArgs?: unknown[],
): { entry: LogEntry; errorObj?: Error | unknown } {
  let message = '';
  let errorObj: Error | unknown;
  let metadata: Record<string, unknown> = {};
  let service = 'frontend';
  let userId: string | null = null;
  let requestId: string | null = null;

  if (messageOrObj instanceof Error) {
    message = messageOrObj.message;
    errorObj = messageOrObj;
  } else if (typeof messageOrObj === 'string') {
    message = messageOrObj;
  } else if (messageOrObj && typeof messageOrObj === 'object') {
    const obj = messageOrObj as Record<string, unknown>;
    message = typeof obj.message === 'string' ? obj.message : JSON.stringify(messageOrObj);
    if (obj.metadata && typeof obj.metadata === 'object') {
      metadata = { ...(obj.metadata as Record<string, unknown>) };
    }
  } else {
    message = String(messageOrObj);
  }

  if (optionsOrArgs && optionsOrArgs.length > 0) {
    const firstExtra = optionsOrArgs[0];
    if (firstExtra instanceof Error) {
      errorObj = firstExtra;
    } else if (firstExtra && typeof firstExtra === 'object') {
      const opts = firstExtra as LoggerPayloadOptions;
      if (opts.service) service = opts.service;
      if (opts.userId !== undefined) userId = opts.userId;
      if (opts.requestId !== undefined) requestId = opts.requestId;
      if (opts.error) errorObj = opts.error;
      if (opts.metadata && typeof opts.metadata === 'object') {
        metadata = { ...metadata, ...opts.metadata };
      }
    }
  }

  const sanitizedMetadata = redactMetadata(metadata);
  const errorStack = errorObj instanceof Error ? errorObj.stack || null : null;

  const entry: LogEntry = {
    level,
    message,
    service,
    metadata: sanitizedMetadata,
    error_stack: errorStack,
    user_id: userId,
    request_id: requestId,
    created_at: new Date().toISOString(),
  };

  return { entry, errorObj };
}

function dispatchTransports(entry: LogEntry, errorObj?: Error | unknown): void {
  // Only forward warn and error to remote persistent sinks
  if (entry.level === 'error' || entry.level === 'warn') {
    try {
      captureToSentry(entry, errorObj);
    } catch {
      // Sentry failure must never crash
    }

    try {
      void persistLogToSupabase(entry);
    } catch {
      // Supabase failure must never crash
    }
  }
}

export const logger = {
  levels,
  setLevel,
  getLevel,
  trace: (...args: unknown[]) => {
    if (shouldLog(levels.TRACE)) console.trace('[trace]', ...args);
  },
  debug: (...args: unknown[]) => {
    if (shouldLog(levels.DEBUG)) {
      console.debug('[debug]', ...args);
      const { entry, errorObj } = normalizeLogEntry('debug', args[0], args.slice(1));
      dispatchTransports(entry, errorObj);
    }
  },
  info: (...args: unknown[]) => {
    if (shouldLog(levels.INFO)) {
      console.info('[info]', ...args);
      const { entry, errorObj } = normalizeLogEntry('info', args[0], args.slice(1));
      dispatchTransports(entry, errorObj);
    }
  },
  warn: (...args: unknown[]) => {
    if (shouldLog(levels.WARN)) {
      console.warn('[warn]', ...args);
    }
    const { entry, errorObj } = normalizeLogEntry('warn', args[0], args.slice(1));
    dispatchTransports(entry, errorObj);
  },
  error: (...args: unknown[]) => {
    if (shouldLog(levels.ERROR)) {
      console.error('[error]', ...args);
    }
    const { entry, errorObj } = normalizeLogEntry('error', args[0], args.slice(1));
    dispatchTransports(entry, errorObj);
  },
};

export default logger;
export * from './logger/types/loggerTypes';
export * from './logger/redact/redactMetadata';
export * from './logger/sentry/sentryTransport';
export * from './logger/supabase/supabaseTransport';
