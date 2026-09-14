/** KV-backed cache utility for read endpoints */

import { json } from '../utils/supabase-client';

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
  if (!kv || prefixes.length === 0) return;

  for (const prefix of prefixes) {
    let cursor: string | undefined;
    do {
      const page = await kv.list({ prefix, cursor });
      await Promise.allSettled(page.keys.map((k) => kv.delete(k.name)));
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
 * Cached handlers return decoded data on the happy path and a Response on the
 * upstream-error path (which withCache deliberately does not cache). This turns
 * either into the Response the route must return.
 */
export function cachedJson(result: unknown): Response {
  return result instanceof Response ? result : json(result);
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
