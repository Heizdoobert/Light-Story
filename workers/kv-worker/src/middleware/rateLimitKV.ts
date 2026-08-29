/** KV-backed sliding window rate limiter — survives cold starts and multiple instances */

type RateLimitStore = Map<string, number[]>;
const ipStore: RateLimitStore = new Map();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSec: number;
};

export function getClientIP(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  );
}

function getLimit(role?: string | null, isAuthOrAdmin = false): number {
  if (role === 'superadmin' || role === 'admin' || role === 'employee') return 600;
  if (role) return 300;
  if (isAuthOrAdmin) return 150;
  return 300;
}

function shouldBypass(ip: string, pathname?: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    pathname?.includes('/admin/r2/file/') ||
    pathname?.includes('/media/') ||
    false
  );
}

/** In-memory fallback when KV unavailable */
function checkRateLimitMemory(
  ip: string,
  limit: number,
): RateLimitResult {
  const now = Date.now();
  const windowMs = 60_000;
  const timestamps = (ipStore.get(ip) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    const oldestInWindow = timestamps[0];
    const resetSec = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
    return { allowed: false, limit, remaining: 0, resetSec };
  }

  timestamps.push(now);
  ipStore.set(ip, timestamps);
  return { allowed: true, limit, remaining: limit - timestamps.length, resetSec: 60 };
}

/** KV-backed sliding window rate limiter */
async function checkRateLimitKV(
  kv: KVNamespace,
  ip: string,
  limit: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = 60_000;
  const windowId = Math.floor(now / windowMs);
  const key = `ratelimit:${ip}:${windowId}`;

  const stored = await kv.get<{ count: number }>(key, 'json');
  const count = stored?.count ?? 0;

  if (count >= limit) {
    const resetSec = Math.max(1, Math.ceil(((windowId + 1) * windowMs - now) / 1000));
    return { allowed: false, limit, remaining: 0, resetSec };
  }

  await kv.put(key, JSON.stringify({ count: count + 1 }), { expirationTtl: 120 });
  return { allowed: true, limit, remaining: limit - count - 1, resetSec: 60 };
}

export async function checkRateLimit(
  request: Request,
  isAuthOrAdmin = false,
  role?: string | null,
  pathname?: string,
  kv?: KVNamespace,
): Promise<RateLimitResult> {
  const ip = getClientIP(request);

  if (shouldBypass(ip, pathname)) {
    return { allowed: true, limit: 999999, remaining: 999999, resetSec: 60 };
  }

  const limit = getLimit(role, isAuthOrAdmin);

  if (kv) {
    try {
      return await checkRateLimitKV(kv, ip, limit);
    } catch {
      // KV failure → fall back to in-memory
    }
  }

  return checkRateLimitMemory(ip, limit);
}
