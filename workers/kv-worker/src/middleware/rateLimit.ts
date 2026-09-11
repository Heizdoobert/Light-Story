type RateLimitStore = Map<string, number[]>;

const ipStore: RateLimitStore = new Map();

/**
 * Hard ceiling on tracked IPs. The store previously grew without bound: entries
 * were pruned only when the same IP came back, so every unique source address
 * was a permanent allocation for the life of the isolate.
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
  // x-forwarded-for can be, and the old fallback chain ended at '127.0.0.1',
  // which was itself a full rate-limit bypass.
  return request.headers.get('cf-connecting-ip') || 'unknown';
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
}

export function checkRateLimit(
  request: Request,
  isAuthOrAdmin = false,
  role?: string | null,
  pathname?: string,
): RateLimitResult {
  const ip = getClientIP(request);
  const now = Date.now();

  // Local development only. Reached solely via a genuine Cloudflare-set
  // loopback address, never via a client header.
  if (ip === '127.0.0.1' || ip === '::1') {
    return { allowed: true, limit: 999999, remaining: 999999, resetSec: 60 };
  }

  // ponytail: this window is per-isolate, so the real global ceiling is
  // limit x isolate count. Move to a Durable Object if the number has to be
  // exact; today it only has to stop runaway clients.
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

  const timestamps = (ipStore.get(ip) || []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= limit) {
    const oldestInWindow = timestamps[0];
    const resetSec = Math.max(1, Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000));
    return { allowed: false, limit, remaining: 0, resetSec };
  }

  timestamps.push(now);
  ipStore.set(ip, timestamps);
  evictIfNeeded(now);

  return {
    allowed: true,
    limit,
    remaining: limit - timestamps.length,
    resetSec: 60,
  };
}
