import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cachedJson,
  invalidateCache,
  IsolateL1Cache,
  l1Cache,
  publicCache,
  publicCacheControl,
  storyCachePrefixes,
  withCache,
} from '../middleware/cache';
import { fakeKV } from './helpers/fake-kv';

beforeEach(() => {
  l1Cache.clear();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('withCache', () => {
  it('does not cache a Response', async () => {
    const kv = fakeKV();

    const first = await withCache(kv, 'k', { ttlSec: 60 }, async () => new Response('first'));
    expect(first).toBeInstanceOf(Response);

    // A Response serializes to "{}". If it were written, this call would read
    // that back and return a plain object instead of the second Response.
    const second = await withCache(kv, 'k', { ttlSec: 60 }, async () => new Response('second'));
    expect(second).toBeInstanceOf(Response);
    expect(await (second as Response).text()).toBe('second');
    expect(kv.store.size).toBe(0);
  });

  it('still caches plain data and calls fn only once', async () => {
    const kv = fakeKV();
    let calls = 0;
    const fn = async () => {
      calls++;
      return { items: [1, 2], total: 2 };
    };

    const first = await withCache(kv, 'd', { ttlSec: 60 }, fn);
    const second = await withCache(kv, 'd', { ttlSec: 60 }, fn);

    expect(first).toEqual({ items: [1, 2], total: 2 });
    expect(second).toEqual({ items: [1, 2], total: 2 });
    expect(calls).toBe(1);
  });

  it('returns from L1 cache immediately without calling kv.get a second time', async () => {
    const kv = fakeKV();
    const getSpy = vi.spyOn(kv, 'get');
    let calls = 0;
    const fn = async () => {
      calls++;
      return { msg: 'l1-fast' };
    };

    const first = await withCache(kv, 'fast-key', { ttlSec: 60 }, fn);
    expect(first).toEqual({ msg: 'l1-fast' });
    expect(calls).toBe(1);
    expect(getSpy).toHaveBeenCalledTimes(1);

    // Second call: served from L1 micro-cache directly, kv.get is not invoked again
    const second = await withCache(kv, 'fast-key', { ttlSec: 60 }, fn);
    expect(second).toEqual({ msg: 'l1-fast' });
    expect(calls).toBe(1);
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to KV after L1 cache expires past TTL', async () => {
    vi.useFakeTimers();
    try {
      const kv = fakeKV();
      const getSpy = vi.spyOn(kv, 'get');
      let calls = 0;
      const fn = async () => {
        calls++;
        return { count: calls };
      };

      // First call: misses both L1 and KV, calls fn(), populates L1 and KV
      const first = await withCache(kv, 'exp-key', { ttlSec: 5 }, fn);
      expect(first).toEqual({ count: 1 });
      expect(calls).toBe(1);
      expect(getSpy).toHaveBeenCalledTimes(1);

      // Advance time past L1 TTL (min(10, 5) = 5s -> advance 6000ms)
      vi.advanceTimersByTime(6000);

      // Second call: L1 cache has expired, falls back to KV
      // KV contains the data so fn() is NOT called, but kv.get IS called
      const second = await withCache(kv, 'exp-key', { ttlSec: 5 }, fn);
      expect(second).toEqual({ count: 1 });
      expect(calls).toBe(1);
      expect(getSpy).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('publicCache', () => {
  it('returns the namespace for an anonymous caller', () => {
    const kv = fakeKV();
    const env = { APP_KV: kv } as unknown as Env;
    expect(publicCache(env, null)).toBe(kv);
  });

  it('returns undefined when the caller presented a token', () => {
    const kv = fakeKV();
    const env = { APP_KV: kv } as unknown as Env;
    expect(publicCache(env, 'eyJhbGciOi.stub.sig')).toBeUndefined();
  });
});

describe('invalidateCache', () => {
  it('deletes every key under a prefix', async () => {
    const kv = fakeKV();
    kv.store.set('cache:stories:list:abc', '{"items":[]}');
    kv.store.set('cache:stories:list:def', '{"items":[]}');
    kv.store.set('cache:story:1', '{}');

    await invalidateCache(kv, ['cache:stories:list']);

    expect(kv.store.has('cache:stories:list:abc')).toBe(false);
    expect(kv.store.has('cache:stories:list:def')).toBe(false);
    // Unrelated keys survive.
    expect(kv.store.has('cache:story:1')).toBe(true);
  });

  it('deletes an exact key, which is a prefix of itself', async () => {
    const kv = fakeKV();
    kv.store.set('cache:categories', '[]');

    await invalidateCache(kv, ['cache:categories']);

    expect(kv.store.has('cache:categories')).toBe(false);
  });

  it('cleans up L1 cache when invalidateCache is called', async () => {
    const kv = fakeKV();
    let calls = 0;
    const fn = async () => {
      calls++;
      return { val: calls };
    };

    // Populate L1 cache and KV
    const first = await withCache(kv, 'sub-key', { prefix: 'cache:stories:list:', ttlSec: 60 }, fn);
    expect(first).toEqual({ val: 1 });
    expect(calls).toBe(1);
    expect(l1Cache.get('cache:stories:list:sub-key')).toEqual({ val: 1 });

    // Invalidate prefix
    await invalidateCache(kv, ['cache:stories:list']);

    // L1 cache entry must be deleted
    expect(l1Cache.get('cache:stories:list:sub-key')).toBeNull();
    // KV entry must also be deleted
    expect(kv.store.has('cache:stories:list:sub-key')).toBe(false);

    // Next request must call fn() again since both L1 and KV were cleared
    const second = await withCache(kv, 'sub-key', { prefix: 'cache:stories:list:', ttlSec: 60 }, fn);
    expect(second).toEqual({ val: 2 });
    expect(calls).toBe(2);
  });
});

describe('storyCachePrefixes', () => {
  it('always covers both list caches', () => {
    expect(storyCachePrefixes()).toEqual(['cache:stories:list', 'cache:comics:list']);
  });

  it('covers the detail caches for a known story', () => {
    const prefixes = storyCachePrefixes('11111111-1111-4111-8111-111111111111');
    expect(prefixes).toContain('cache:story:11111111-1111-4111-8111-111111111111');
    expect(prefixes).toContain('cache:comic:11111111-1111-4111-8111-111111111111');
    expect(prefixes).toContain('cache:chapters:11111111-1111-4111-8111-111111111111');
  });

  it('ignores a missing id rather than emitting an undefined key', () => {
    expect(storyCachePrefixes(null).some((p) => p.includes('undefined') || p.includes('null'))).toBe(false);
  });
});

describe('IsolateL1Cache', () => {
  it('respects maxSize and evicts the oldest entry (FIFO/LRU)', () => {
    const cache = new IsolateL1Cache(3);
    cache.set('k1', 'v1', 60);
    cache.set('k2', 'v2', 60);
    cache.set('k3', 'v3', 60);
    expect(cache.size()).toBe(3);

    // Access k1 to make k2 the oldest entry
    expect(cache.get('k1')).toBe('v1');

    // Adding 4th element should evict k2
    cache.set('k4', 'v4', 60);
    expect(cache.size()).toBe(3);
    expect(cache.get('k2')).toBeNull();
    expect(cache.get('k1')).toBe('v1');
    expect(cache.get('k3')).toBe('v3');
    expect(cache.get('k4')).toBe('v4');
  });

  it('supports delete, clear, and size methods', () => {
    const cache = new IsolateL1Cache(10);
    cache.set('a', 1, 60);
    cache.set('b', 2, 60);
    expect(cache.size()).toBe(2);

    cache.delete('a');
    expect(cache.size()).toBe(1);
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBe(2);

    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('b')).toBeNull();
  });

  it('expires entries after ttlSec', () => {
    vi.useFakeTimers();
    try {
      const cache = new IsolateL1Cache(10);
      cache.set('k', 'v', 2);
      expect(cache.get('k')).toBe('v');

      vi.advanceTimersByTime(3000);
      expect(cache.get('k')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('publicCacheControl', () => {
  it('formats standard public Cache-Control for anonymous callers', () => {
    expect(publicCacheControl(60)).toBe('public, max-age=60, s-maxage=60, stale-while-revalidate=30');
    expect(publicCacheControl(600)).toBe('public, max-age=60, s-maxage=600, stale-while-revalidate=30');
    expect(publicCacheControl(10)).toBe('public, max-age=10, s-maxage=10, stale-while-revalidate=5');
  });

  it('formats private, no-cache when an authenticated token is present', () => {
    expect(publicCacheControl(60, 'user-token')).toBe('private, no-cache');
    expect(publicCacheControl(600, 'staff-token')).toBe('private, no-cache');
  });
});

describe('cachedJson', () => {
  it('sets Cache-Control header when ttlSec is provided', () => {
    const res = cachedJson({ data: 'hello' }, 60);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=60, stale-while-revalidate=30');
  });

  it('sets private, no-cache when token is provided', () => {
    const res = cachedJson({ data: 'hello' }, 60, 'auth-token');
    expect(res.headers.get('Cache-Control')).toBe('private, no-cache');
  });

  it('passes through error Response without attaching public Cache-Control', () => {
    const errRes = new Response('err', { status: 500 });
    const res = cachedJson(errRes, 60);
    expect(res).toBe(errRes);
    expect(res.headers.get('Cache-Control')).toBeNull();
  });

  it('attaches Cache-Control to an existing 200 Response if missing', () => {
    const okRes = new Response('ok', { status: 200 });
    const res = cachedJson(okRes, 300);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=300, stale-while-revalidate=30');
  });
});

