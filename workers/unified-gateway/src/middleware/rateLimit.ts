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

export function checkRateLimit(
  request: Request,
  isAuthOrAdmin = false,
  role?: string | null,
  pathname?: string,
): RateLimitResult {
  const ip = getClientIP(request);
  const now = Date.now();
  const windowMs = 60_000;

  // Bypass rate limits for local development and static R2 file requests
  if (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    pathname?.includes('/admin/r2/file/')
  ) {
    return {
      allowed: true,
      limit: 999999,
      remaining: 999999,
      resetSec: 60,
    };
  }

  // Determine rate limits based on user role and request path
  let limit = 300;
  if (role === 'superadmin' || role === 'admin' || role === 'employee') {
    limit = 600; // High limit for staff CMS operations
  } else if (role) {
    limit = 300; // Authenticated user limit
  } else if (isAuthOrAdmin) {
    limit = 150; // Anonymous Auth/Admin route limit
  }

  const timestamps = (ipStore.get(ip) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    const oldestInWindow = timestamps[0];
    const resetSec = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSec,
    };
  }

  timestamps.push(now);
  ipStore.set(ip, timestamps);

  return {
    allowed: true,
    limit,
    remaining: limit - timestamps.length,
    resetSec: 60,
  };
}
