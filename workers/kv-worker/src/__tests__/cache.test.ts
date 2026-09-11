import { describe, expect, it } from 'vitest';
import { withCache } from '../middleware/cache';

/** Minimal in-memory stand-in for a KVNamespace. Exported for the other cache tests. */
export function fakeKV(): KVNamespace & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    get: async (key: string) => {
      const raw = store.get(key);
      return raw === undefined ? null : JSON.parse(raw);
    },
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async ({ prefix }: { prefix?: string; cursor?: string } = {}) => {
      const names = [...store.keys()].filter((k) => !prefix || k.startsWith(prefix));
      return { keys: names.map((name) => ({ name })), list_complete: true, cursor: undefined };
    },
  } as unknown as KVNamespace & { store: Map<string, string> };
}

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
