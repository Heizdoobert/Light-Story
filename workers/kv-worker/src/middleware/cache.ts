/** KV-backed cache utility for read endpoints */

import { json } from '../utils/supabase-client';
import { l1Cache, IsolateL1Cache } from './isolate-l1-cache';

export { l1Cache, IsolateL1Cache };

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

  // 1. Try L1 in-memory micro-cache (0.1ms read latency)
  const l1Hit = l1Cache.get<T>(cacheKey);
  if (l1Hit !== null) return l1Hit;

  // 2. Try L2 KV store
  try {
    const cached = await kv.get<T>(cacheKey, 'json');
    if (cached !== null) {
      l1Cache.set(cacheKey, cached, Math.min(10, opts.ttlSec));
      return cached;
    }
  } catch {
    // KV read failure → proceed to fn
  }

  // 3. Cache miss on both L1 and KV → invoke fn
  const result = await fn();

  // A Response cannot survive JSON.stringify — it serializes to "{}". Callers
  // return one on the upstream-error path, and caching that would serve an
  // empty object under a 200 for the whole TTL. Pass it through uncached.
  if (result instanceof Response) return result;

  try {
    await kv.put(cacheKey, JSON.stringify(result), {
      expirationTtl: opts.ttlSec,
    });
  } catch {
    // KV write failure → silent, next request will miss again
  }

  l1Cache.set(cacheKey, result, Math.min(10, opts.ttlSec));

  return result;
}

/**
 * Delete every cache key under each given prefix.
 *
 * The previous version passed its arguments straight to kv.delete, which takes
 * an exact key, while call sites passed globs like 'cache:stories:list:*'. The
 * real keys are 'cache:stories:list:<hash>' from buildCacheKey, so nothing was
 * ever deleted and list caches only ever expired by TTL. KV does support
 * prefix listing, which is what this needs.
 *
 * An exact key still works: a key is a prefix of itself.
 */
export async function invalidateCache(
  kv: KVNamespace | undefined,
  prefixes: string[],
): Promise<void> {
  if (prefixes.length === 0) return;

  // Invalidate matching keys from in-memory L1 cache
  for (const prefix of prefixes) {
    l1Cache.deletePrefix(prefix);
  }

  if (!kv) return;

  for (const prefix of prefixes) {
    let cursor: string | undefined;
    do {
      const page = await kv.list({ prefix, cursor });
      await Promise.allSettled(
        page.keys.map((k) => {
          l1Cache.delete(k.name);
          return kv.delete(k.name);
        })
      );
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
  }
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

/**
 * Standard Cache-Control header generator for public cache responses.
 * Ensures browser and Cloudflare CDN micro-cache operate optimally.
 */
export function publicCacheControl(ttlSec: number, token?: string | null): string {
  if (token) return 'private, no-cache';
  const browserMaxAge = Math.min(60, ttlSec);
  const swr = Math.min(30, Math.floor(ttlSec / 2));
  return `public, max-age=${browserMaxAge}, s-maxage=${ttlSec}, stale-while-revalidate=${swr}`;
}

/**
 * Cached handlers return decoded data on the happy path and a Response on the
 * upstream-error path (which withCache deliberately does not cache). This turns
 * either into the Response the route must return with appropriate Cache-Control headers.
 */
export function cachedJson(
  result: unknown,
  cacheControlOrTtl?: string | number,
  token?: string | null,
): Response {
  let cacheControl: string | undefined;
  if (typeof cacheControlOrTtl === 'number') {
    cacheControl = publicCacheControl(cacheControlOrTtl, token);
  } else if (typeof cacheControlOrTtl === 'string') {
    cacheControl = cacheControlOrTtl;
  }

  if (result instanceof Response) {
    if (cacheControl && result.ok && !result.headers.has('Cache-Control')) {
      const headers = new Headers(result.headers);
      headers.set('Cache-Control', cacheControl);
      return new Response(result.body, {
        status: result.status,
        statusText: result.statusText,
        headers,
      });
    }
    return result;
  }

  const headers = cacheControl ? { 'Cache-Control': cacheControl } : undefined;
  return json(result, 200, headers);
}

/**
 * Selects the namespace a read path may cache into.
 *
 * Rows are fetched with the caller's Supabase token, so PostgREST applies that
 * caller's row-level security and two callers see different rows for the same
 * query. Every cache key here is derived from the URL alone, so caching an
 * authenticated result publishes it to everyone until the TTL expires — an
 * author reading their own unpublished story would populate the key that
 * anonymous readers then hit.
 *
 * Cache anonymous reads only. Authenticated callers always reach Supabase,
 * which also means staff see their own edits immediately.
 */
export function publicCache(env: Env, token: string | null): KVNamespace | undefined {
  return token ? undefined : env.APP_KV;
}

/**
 * Cache prefixes a story or chapter mutation invalidates.
 *
 * Both list caches always go, because a mutation can change what appears on any
 * page of either listing. The three detail prefixes only go when the caller
 * knows which story changed.
 */
export function storyCachePrefixes(storyId?: string | null): string[] {
  const prefixes = ['cache:stories:list', 'cache:comics:list'];
  if (storyId) {
    prefixes.push(
      `cache:story:${storyId}`,
      `cache:comic:${storyId}`,
      `cache:chapters:${storyId}`,
    );
  }
  return prefixes;
}
