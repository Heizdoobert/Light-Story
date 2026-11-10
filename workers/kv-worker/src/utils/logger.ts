/**
 * Lightweight, zero-dependency structured logger and telemetry dispatcher.
 * Supports structured console output and Cloudflare Analytics Engine ingestion.
 */

import { recordAnalyticsEngineEvent } from './supabase-client';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEventOptions {
  level?: LogLevel;
  indexes?: string[];
}

function safeSerialize(obj: unknown): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    });
  } catch {
    return '{"error":"serialization_failed"}';
  }
}

/**
 * Dispatches structured log events safely without throwing errors.
 */
export async function logEvent(
  env: any,
  name: string,
  data: Record<string, unknown> = {},
  options?: LogEventOptions,
): Promise<void> {
  const level: LogLevel = options?.level || 'info';
  const timestamp = new Date().toISOString();

  // 1. Structured Console Logging
  try {
    const payload = {
      event: name,
      level,
      timestamp,
      ...(data && typeof data === 'object' ? data : { rawData: String(data) }),
    };
    const serialized = safeSerialize(payload);

    if (level === 'error') {
      console.error(`[Event:${name}]`, serialized);
    } else if (level === 'warn') {
      console.warn(`[Event:${name}]`, serialized);
    } else {
      console.log(`[Event:${name}]`, serialized);
    }
  } catch {
    // Non-blocking console logging
  }

  // 2. Telemetry ingestion via Cloudflare Analytics Engine
  try {
    if (env && env.ANALYTICS_DATA && typeof env.ANALYTICS_DATA.writeDataPoint === 'function') {
      const indexes = options?.indexes && options.indexes.length > 0 ? options.indexes : [name];
      const blobs = [
        name,
        typeof data?.userId === 'string' ? data.userId : '',
        typeof data?.ip === 'string' ? data.ip : '',
        typeof data?.message === 'string' ? data.message : '',
      ];
      const doubles = [Date.now()];

      recordAnalyticsEngineEvent(env, {
        indexes,
        blobs,
        doubles,
      });
    }
  } catch {
    // Telemetry failures must never disrupt runtime requests
  }
}
