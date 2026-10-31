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

export const logger = {
  levels,
  setLevel,
  getLevel,
  trace: (...args: unknown[]) => { if (shouldLog(levels.TRACE)) console.trace('[trace]', ...args); },
  debug: (...args: unknown[]) => { if (shouldLog(levels.DEBUG)) console.debug('[debug]', ...args); },
  info: (...args: unknown[]) => { if (shouldLog(levels.INFO)) console.info('[info]', ...args); },
  warn: (...args: unknown[]) => { if (shouldLog(levels.WARN)) console.warn('[warn]', ...args); },
  error: (...args: unknown[]) => { if (shouldLog(levels.ERROR)) console.error('[error]', ...args); },
};

export default logger;
export * from './logger/types/loggerTypes';
export * from './logger/redact/redactMetadata';
export * from './logger/sentry/sentryTransport';
export * from './logger/supabase/supabaseTransport';
