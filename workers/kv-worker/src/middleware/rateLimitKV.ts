/** KV-backed sliding window rate limiter — survives cold starts and multiple instances */

import { logEvent } from '../utils/logger';

type RateLimitStore = Map<string, number[]>;
const ipStore: RateLimitStore = new Map();

/**
 * Hard ceiling on IPs tracked by the in-memory fallback. The store otherwise
 * grows without bound: entries are pruned only when the same IP comes back, so
 * every unique source address is a permanent allocation for the isolate's life.
 */
export const MAX_TRACKED_IPS = 10_000;

const WINDOW_MS = 60_000;

/** Test hook. Not used by the request path. */
export function trackedIpCount(): number {
  return ipStore.size;
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSec: number;
};

export function getClientIP(request: Request): string {
  // cf-connecting-ip is set by Cloudflare and cannot be spoofed by the client.
  // x-forwarded-for can be, and a fallback chain ending at '127.0.0.1' hands
  // every caller the loopback bypass below for the cost of one header.
  return request.headers.get('cf-connecting-ip') || 'unknown';
}

function getLimit(role: string | null | undefined, isAuthOrAdmin: boolean, pathname?: string): number {
  let limit = 300;
  if (role === 'superadmin' || role === 'admin' || role === 'employee') {
    limit = 600; // High limit for staff CMS operations
  } else if (role) {
    limit = 300; // Authenticated user limit
  } else if (isAuthOrAdmin) {
    limit = 150; // Anonymous Auth/Admin route limit
  }

  // Static asset reads are cheap and bursty (a chapter is ~40 images), but they
  // are billed R2 egress, so they get a high ceiling rather than no ceiling.
  if (pathname?.includes('/media/') || pathname?.includes('/admin/r2/file/')) {
    limit = Math.max(limit, 3000);
  }

  return limit;
}

function shouldBypass(ip: string): boolean {
  // Local development only. Reached solely via a genuine Cloudflare-set
  // loopback address, never via a client-supplied header.
  return ip === '127.0.0.1' || ip === '::1';
}

/** Drops entries whose whole window has expired, then the oldest, until under the cap. */
function evictIfNeeded(now: number): void {
  if (ipStore.size <= MAX_TRACKED_IPS) return;

  for (const [ip, timestamps] of ipStore) {
    if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] >= WINDOW_MS) {
      ipStore.delete(ip);
    }
  }

  // Map iterates in insertion order, so this drops the least recently created.
  while (ipStore.size > MAX_TRACKED_IPS) {
    const oldest = ipStore.keys().next();
    if (oldest.done) break;
    ipStore.delete(oldest.value);
  }
  logEvent(null, 'rate_limit_evicted', { remainingIps: ipStore.size }, { level: 'info' });
}

/** In-memory fallback when KV unavailable */
function checkRateLimitMemory(ip: string, limit: number): RateLimitResult {
  const now = Date.now();
  const timestamps = (ipStore.get(ip) || []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= limit) {
    const oldestInWindow = timestamps[0];
    const resetSec = Math.max(1, Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000));
    return { allowed: false, limit, remaining: 0, resetSec };
  }

  timestamps.push(now);
  ipStore.set(ip, timestamps);
  evictIfNeeded(now);

  return { allowed: true, limit, remaining: limit - timestamps.length, resetSec: 60 };
}

/**
 * In-isolate sequential execution queue per IP.
 * Guarantees that concurrent requests from the same client IP inside the worker
 * isolate do not race on read-modify-write, preventing burst overshoot.
 */
const ipExecutionQueues = new Map<string, Promise<unknown>>();

async function synchronizeByIp<T>(ip: string, action: () => Promise<T>): Promise<T> {
  const previous = ipExecutionQueues.get(ip) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  ipExecutionQueues.set(ip, current);

  try {
    await previous;
    return await action();
  } finally {
    release();
    if (ipExecutionQueues.get(ip) === current) {
      ipExecutionQueues.delete(ip);
    }
  }
}

/** KV-backed sliding window rate limiter */
async function checkRateLimitKV(
  kv: KVNamespace,
  ip: string,
  limit: number,
): Promise<RateLimitResult> {
  return synchronizeByIp(ip, async () => {
    const now = Date.now();
    const windowId = Math.floor(now / WINDOW_MS);
    const key = `ratelimit:${ip}:${windowId}`;

    const stored = await kv.get<{ count: number }>(key, 'json');
    const count = stored?.count ?? 0;

    if (count >= limit) {
      const resetSec = Math.max(1, Math.ceil(((windowId + 1) * WINDOW_MS - now) / 1000));
      return { allowed: false, limit, remaining: 0, resetSec };
    }

    await kv.put(key, JSON.stringify({ count: count + 1 }), { expirationTtl: 120 });
    return { allowed: true, limit, remaining: limit - count - 1, resetSec: 60 };
  });
}

export async function checkRateLimit(
  request: Request,
  isAuthOrAdmin = false,
  role?: string | null,
  pathname?: string,
  kv?: KVNamespace,
): Promise<RateLimitResult> {
  const ip = getClientIP(request);

  if (shouldBypass(ip)) {
    logEvent(null, 'rate_limit_bypassed', { ip }, { level: 'debug' });
    return { allowed: true, limit: 999999, remaining: 999999, resetSec: 60 };
  }

  const limit = getLimit(role, isAuthOrAdmin, pathname);
  let res: RateLimitResult;

  if (kv) {
    try {
      res = await checkRateLimitKV(kv, ip, limit);
    } catch (err) {
      logEvent(null, 'rate_limit_kv_failure', { ip, error: (err as Error).message }, { level: 'warn' });
      res = checkRateLimitMemory(ip, limit);
    }
  } else {
    res = checkRateLimitMemory(ip, limit);
  }

  if (!res.allowed) {
    logEvent(
      null,
      'rate_limit_exceeded',
      { ip, limit: res.limit, resetSec: res.resetSec, pathname, role },
      { level: 'warn' },
    );
  } else {
    logEvent(
      null,
      'rate_limit_allowed',
      { ip, remaining: res.remaining, limit: res.limit },
      { level: 'debug' },
    );
  }

  return res;
}
