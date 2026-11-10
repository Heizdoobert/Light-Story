import type { LogEntry } from '../types/loggerTypes';
import type { SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

const THROTTLE_WINDOW_MS = 10_000;
const MAX_IDENTICAL_LOGS_PER_WINDOW = 3;
const recentLogs = new Map<string, { count: number; firstSeen: number }>();

function isThrottled(key: string): boolean {
  const now = Date.now();
  const existing = recentLogs.get(key);
  if (!existing || now - existing.firstSeen > THROTTLE_WINDOW_MS) {
    recentLogs.set(key, { count: 1, firstSeen: now });
    if (recentLogs.size > 200) {
      for (const [k, v] of recentLogs.entries()) {
        if (now - v.firstSeen > THROTTLE_WINDOW_MS) recentLogs.delete(k);
      }
    }
    return false;
  }
  existing.count++;
  return existing.count > MAX_IDENTICAL_LOGS_PER_WINDOW;
}

/**
 * Safely resolves the Supabase client without failing if environment variables are missing.
 */
async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (cachedClient) return cachedClient;
  try {
    const mod = await import('../../supabaseClient');
    cachedClient = mod.supabase;
    return cachedClient;
  } catch {
    return null;
  }
}

/**
 * Sets a custom Supabase client for testing or isolated environments.
 */
export function setSupabaseClientForLogger(client: SupabaseClient | null): void {
  cachedClient = client;
}

/**
 * Persists a structured log entry into the `public.system_logs` table in Supabase.
 * Guaranteed to be non-blocking with swallowed errors to protect application execution.
 */
export async function persistLogToSupabase(entry: LogEntry): Promise<void> {
  try {
    const throttleKey = `${entry.level}:${entry.service ?? 'default'}:${entry.message}`;
    if (isThrottled(throttleKey)) {
      return;
    }

    const client = await getSupabaseClient();
    if (!client || typeof client.from !== 'function') {
      return;
    }

    const payload = {
      level: entry.level,
      message: entry.message,
      service: entry.service ?? 'default',
      metadata: entry.metadata ?? {},
      error_stack: entry.error_stack ?? null,
      user_id: entry.user_id ?? null,
      request_id: entry.request_id ?? null,
    };

    const { error } = await client.from('system_logs').insert([payload]);
    if (error && process.env.NODE_ENV === 'development') {
      console.warn('[Logger] Failed to persist system log to Supabase:', error.message);
    }
  } catch {
    // Non-blocking background log writes must never crash caller
  }
}
