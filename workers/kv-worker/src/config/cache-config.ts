// Central cache configuration for KV Worker
// Ponytail: minimal constants, no extra dependencies
export const DEFAULT_TTL_SEC = 60; // 1 minute default TTL
export const MAX_TTL_SEC = 3600; // 1 hour max TTL
export const CACHE_CONTROL_PUBLIC = (ttlSec: number) => {
  const browserMaxAge = Math.min(60, ttlSec);
  const swr = Math.min(30, Math.floor(ttlSec / 2));
  return `public, max-age=${browserMaxAge}, s-maxage=${ttlSec}, stale-while-revalidate=${swr}`;
};
