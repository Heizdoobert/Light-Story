import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IndexedDBStorageAdapter } from '../storage/adapters/indexeddb-adapter';
import { createStorageAdapter } from '../storage/adapters/factory';

/** Minimal mock implementation of IDBDatabase and IDBObjectStore for testing */
function createMockIndexedDB() {
  const stores = new Map<string, Map<string, unknown>>();

  return {
    open: (dbName: string, version: number) => {
      const req: any = {
        result: null,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      setTimeout(() => {
        const db: any = {
          objectStoreNames: {
            contains: (name: string) => stores.has(name),
          },
          createObjectStore: (name: string) => {
            if (!stores.has(name)) stores.set(name, new Map());
            return {};
          },
          transaction: (storeName: string, mode: string) => {
            if (!stores.has(storeName)) stores.set(storeName, new Map());
            const storeMap = stores.get(storeName)!;

            return {
              objectStore: () => ({
                get: (key: string) => {
                  const getReq: any = { result: storeMap.get(key), onsuccess: null, onerror: null };
                  setTimeout(() => getReq.onsuccess && getReq.onsuccess({ target: getReq }), 0);
                  return getReq;
                },
                put: (val: unknown, key: string) => {
                  storeMap.set(key, val);
                  const putReq: any = { result: key, onsuccess: null, onerror: null };
                  setTimeout(() => putReq.onsuccess && putReq.onsuccess({ target: putReq }), 0);
                  return putReq;
                },
                delete: (key: string) => {
                  storeMap.delete(key);
                  const delReq: any = { result: undefined, onsuccess: null, onerror: null };
                  setTimeout(() => delReq.onsuccess && delReq.onsuccess({ target: delReq }), 0);
                  return delReq;
                },
                clear: () => {
                  storeMap.clear();
                  const clrReq: any = { result: undefined, onsuccess: null, onerror: null };
                  setTimeout(() => clrReq.onsuccess && clrReq.onsuccess({ target: clrReq }), 0);
                  return clrReq;
                },
                getAllKeys: () => {
                  const keysReq: any = { result: Array.from(storeMap.keys()), onsuccess: null, onerror: null };
                  setTimeout(() => keysReq.onsuccess && keysReq.onsuccess({ target: keysReq }), 0);
                  return keysReq;
                },
              }),
            };
          },
        };

        req.result = db;
        if (req.onupgradeneeded) req.onupgradeneeded({ target: req });
        if (req.onsuccess) req.onsuccess({ target: req });
      }, 0);

      return req;
    },
  };
}

describe('IndexedDBStorageAdapter', () => {
  const originalIndexedDB = (globalThis as any).indexedDB;
  const originalWindow = (globalThis as any).window;

  beforeEach(() => {
    const mockIDB = createMockIndexedDB();
    (globalThis as any).window = { indexedDB: mockIDB };
  });

  afterEach(() => {
    (globalThis as any).indexedDB = originalIndexedDB;
    (globalThis as any).window = originalWindow;
  });

  it('initializes with expected adapter name and prefix', () => {
    const adapter = new IndexedDBStorageAdapter({ prefix: 'comic' });
    expect(adapter.name).toBe('indexeddb');
  });

  it('sets, gets, checks, and removes items successfully', async () => {
    const adapter = new IndexedDBStorageAdapter({ prefix: 'cache' });

    await adapter.setItem('chapter-1', { pages: 45 });
    expect(await adapter.has('chapter-1')).toBe(true);

    const data = await adapter.getItem<{ pages: number }>('chapter-1');
    expect(data).toEqual({ pages: 45 });

    await adapter.removeItem('chapter-1');
    expect(await adapter.has('chapter-1')).toBe(false);
    expect(await adapter.getItem('chapter-1')).toBeNull();
  });

  it('respects TTL expiration and returns null when expired', async () => {
    const adapter = new IndexedDBStorageAdapter();

    // Item valid before expiration
    await adapter.setItem('temp-key', 'temporary value', 2000); // 2s TTL
    expect(await adapter.getItem('temp-key')).toBe('temporary value');

    // Item expired
    await adapter.setItem('short-key', 'expires soon', 15);
    await new Promise((resolve) => setTimeout(resolve, 35));
    expect(await adapter.getItem('short-key')).toBeNull();
  });

  it('retrieves keys and filters by prefix', async () => {
    const adapter = new IndexedDBStorageAdapter({ prefix: 'user' });

    await adapter.setItem('pref:theme', 'dark');
    await adapter.setItem('pref:lang', 'vi');
    await adapter.setItem('profile:id', '123');

    const allKeys = await adapter.keys();
    expect(allKeys.sort()).toEqual(['pref:lang', 'pref:theme', 'profile:id'].sort());

    const prefKeys = await adapter.keys('pref:');
    expect(prefKeys.sort()).toEqual(['pref:lang', 'pref:theme'].sort());
  });

  it('clears items accurately within prefix namespace', async () => {
    const adapter = new IndexedDBStorageAdapter({ prefix: 'tenantA' });

    await adapter.setItem('k1', 'v1');
    await adapter.setItem('k2', 'v2');
    expect((await adapter.keys()).length).toBe(2);

    await adapter.clear();
    expect((await adapter.keys()).length).toBe(0);
  });

  it('handles SSR / non-browser environments gracefully in factory', () => {
    (globalThis as any).window = undefined;

    // Should fall back to MemoryStorageAdapter in SSR
    const adapter = createStorageAdapter({ type: 'indexeddb', fallbackToMemory: true });
    expect(adapter.name).toBe('memory');
  });
});
