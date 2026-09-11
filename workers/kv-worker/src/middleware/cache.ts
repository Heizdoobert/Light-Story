/** KV-backed cache utility for read endpoints */

export type CacheOptions = {
  ttlSec: number;
  prefix?: string;
};

const DEFAULT_PREFIX = 'cache:';

/**
 * Try cache first; on miss, call fn, store result, return it.
 * Returns fn() result directly if KV unavailable.
 */
export async function withCache<T>(
  kv: KVNamespace | undefined,
  key: string,
  opts: CacheOptions,
  fn: () => Promise<T>,
): Promise<T> {
  if (!kv) return fn();

  const cacheKey = `${opts.prefix ?? DEFAULT_PREFIX}${key}`;

  try {
    const cached = await kv.get<T>(cacheKey, 'json');
    if (cached !== null) return cached;
  } catch {
    // KV read failure → proceed to fn
  }

  const result = await fn();

  try {
    await kv.put(cacheKey, JSON.stringify(result), {
      expirationTtl: opts.ttlSec,
    });
  } catch {
    // KV write failure → silent, next request will miss again
  }

  return result;
}

/**
 * Invalidate cache keys matching a prefix pattern.
 * KV doesn't support wildcard delete, so we track keys via a Set.
 * For simplicity, delete known key patterns directly.
 */
export async function invalidateCache(
  kv: KVNamespace | undefined,
  keys: string[],
): Promise<void> {
  if (!kv || keys.length === 0) return;

  await Promise.allSettled(
    keys.map((k) => kv.delete(k)),
  );
}

/**
 * Build a deterministic cache key from query parameters.
 * Sorts keys to ensure consistent hashing.
 */
export function buildCacheKey(prefix: string, params: Record<string, string | number | undefined>): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return sorted ? `${prefix}:${hashString(sorted)}` : prefix;
}

/** Simple FNV-1a hash → hex string (fast, no crypto needed) */
function hashString(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
