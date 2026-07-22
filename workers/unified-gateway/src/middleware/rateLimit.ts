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

export function checkRateLimit(request: Request, isAuthOrAdmin = false): RateLimitResult {
  const ip = getClientIP(request);
  const now = Date.now();
  const windowMs = 60_000;
  const limit = isAuthOrAdmin ? 20 : 100;

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
