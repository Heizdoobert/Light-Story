import { describe, it, expect, vi } from 'vitest';
import {
  MemoryStorageAdapter,
  WebStorageAdapter,
  createStorageAdapter,
} from '../storage/adapters';

describe('Storage Adapters Subsystem', () => {
  describe('MemoryStorageAdapter', () => {
    it('sets, gets, removes, and checks existence of keys', async () => {
      const adapter = new MemoryStorageAdapter({ prefix: 'test:' });

      await adapter.setItem('user', { name: 'Alice' });
      expect(await adapter.has('user')).toBe(true);

      const val = await adapter.getItem<{ name: string }>('user');
      expect(val).toEqual({ name: 'Alice' });

      // Synchronous access
      expect(adapter.getItemSync<{ name: string }>('user')).toEqual({ name: 'Alice' });

      await adapter.removeItem('user');
      expect(await adapter.has('user')).toBe(false);
      expect(await adapter.getItem('user')).toBeNull();
    });

    it('respects item-level TTL expiration', async () => {
      const adapter = new MemoryStorageAdapter();

      await adapter.setItem('shortLived', 'expires soon', 20); // 20ms
      expect(await adapter.getItem('shortLived')).toBe('expires soon');

      await new Promise((resolve) => setTimeout(resolve, 35));
      expect(await adapter.getItem('shortLived')).toBeNull();
      expect(await adapter.has('shortLived')).toBe(false);
    });

    it('evicts oldest entries when maxItems bound is exceeded', async () => {
      const adapter = new MemoryStorageAdapter({ maxItems: 3 });

      adapter.setItemSync('k1', 'v1');
      adapter.setItemSync('k2', 'v2');
      adapter.setItemSync('k3', 'v3');

      // Access k1 to make k2 the least recently used
      adapter.getItemSync('k1');

      // Adding 4th item should evict k2
      adapter.setItemSync('k4', 'v4');

      expect(adapter.getItemSync('k1')).toBe('v1');
      expect(adapter.getItemSync('k2')).toBeNull(); // Evicted!
      expect(adapter.getItemSync('k3')).toBe('v3');
      expect(adapter.getItemSync('k4')).toBe('v4');
    });

    it('clears and lists keys matching prefix filter', async () => {
      const adapter = new MemoryStorageAdapter({ prefix: 'app:' });

      await adapter.setItem('pref:theme', 'dark');
      await adapter.setItem('pref:lang', 'en');
      await adapter.setItem('data:users', [1, 2]);

      const allKeys = await adapter.keys();
      expect(allKeys.sort()).toEqual(['data:users', 'pref:lang', 'pref:theme']);

      const prefKeys = await adapter.keys('pref:');
      expect(prefKeys.sort()).toEqual(['pref:lang', 'pref:theme']);

      await adapter.clear();
      expect(await adapter.keys()).toEqual([]);
    });
  });

  describe('WebStorageAdapter', () => {
    function createMockStorage(): Storage {
      const store = new Map<string, string>();
      return {
        get length() {
          return store.size;
        },
        clear: vi.fn(() => store.clear()),
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
        removeItem: vi.fn((key: string) => {
          store.delete(key);
        }),
        setItem: vi.fn((key: string, value: string) => {
          store.set(key, value);
        }),
      };
    }

    it('persists and retrieves JSON data through underlying Storage', async () => {
      const mockStorage = createMockStorage();
      const adapter = new WebStorageAdapter(mockStorage, { prefix: 'test:' });

      await adapter.setItem('config', { theme: 'dark', version: 2 });
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'test:config',
        expect.stringContaining('"theme":"dark"'),
      );

      const fetched = await adapter.getItem<{ theme: string; version: number }>('config');
      expect(fetched).toEqual({ theme: 'dark', version: 2 });
    });

    it('triggers LRU quota eviction on QuotaExceededError and retries write', async () => {
      const mockStorage = createMockStorage();
      let quotaTriggered = false;

      // Seed 2 existing items
      mockStorage.setItem(
        'ls:oldKey',
        JSON.stringify({ value: 'old', metadata: { createdAt: 100, updatedAt: 100 } }),
      );
      mockStorage.setItem(
        'ls:recentKey',
        JSON.stringify({ value: 'recent', metadata: { createdAt: 200, updatedAt: 200 } }),
      );

      const realSetItem = mockStorage.setItem;
      mockStorage.setItem = vi.fn((key: string, value: string) => {
        if (!quotaTriggered && key === 'ls:newKey') {
          quotaTriggered = true;
          const err = new Error('Quota exceeded');
          err.name = 'QuotaExceededError';
          throw err;
        }
        return realSetItem.call(mockStorage, key, value);
      });

      const adapter = new WebStorageAdapter(mockStorage, { prefix: 'ls:' });
      await adapter.setItem('newKey', 'new value');

      // Old key should be evicted to free quota
      expect(mockStorage.removeItem).toHaveBeenCalledWith('ls:oldKey');
      expect(await adapter.getItem('newKey')).toBe('new value');
    });

    it('gracefully falls back to MemoryStorageAdapter if Storage throws on probe', async () => {
      const faultyStorage = {
        setItem: vi.fn(() => {
          throw new Error('Access is denied (SecurityError)');
        }),
      } as unknown as Storage;

      const adapter = new WebStorageAdapter(faultyStorage);
      await adapter.setItem('privateModeKey', 'safe');
      expect(await adapter.getItem('privateModeKey')).toBe('safe');
    });
  });

  describe('createStorageAdapter factory', () => {
    it('creates MemoryStorageAdapter when type is memory', () => {
      const adapter = createStorageAdapter({ type: 'memory' });
      expect(adapter.name).toBe('memory');
    });

    it('creates MemoryStorageAdapter when window is undefined', () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error test SSR mock
      delete globalThis.window;

      try {
        const adapter = createStorageAdapter({ type: 'local' });
        expect(adapter.name).toBe('memory');
      } finally {
        globalThis.window = originalWindow;
      }
    });
  });
});
