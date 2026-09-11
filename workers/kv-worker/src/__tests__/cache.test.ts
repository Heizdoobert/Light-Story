import { describe, expect, it } from 'vitest';
import { invalidateCache, publicCache, storyCachePrefixes, withCache } from '../middleware/cache';
import { fakeKV } from './helpers/fake-kv';

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
