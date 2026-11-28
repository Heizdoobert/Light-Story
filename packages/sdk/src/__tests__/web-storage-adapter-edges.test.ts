import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebStorageAdapter } from '../storage/adapters/web-storage-adapter';

class FakeStorage implements Storage {
  readonly map = new Map<string, string>();
  keyAt: (index: number) => string | null = (index) => Array.from(this.map.keys())[index] ?? null;
  throwOnSet?: (key: string, value: string) => void;

  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return this.keyAt(index);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.throwOnSet?.(key, value);
    this.map.set(key, value);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WebStorageAdapter edge branches', () => {
  it('falls back to memory when no storage is provided', async () => {
    const adapter = new WebStorageAdapter();
    expect(adapter.name).toBe('localStorage');

    adapter.setItemSync('k', 1);
    expect(adapter.getItemSync('k')).toBe(1);
    await adapter.removeItem('k');
    await adapter.clear();
    expect(await adapter.keys()).toEqual([]);
  });

  it('accepts an empty prefix and already-prefixed keys', () => {
    const storage = new FakeStorage();
    const adapter = new WebStorageAdapter(storage, { prefix: '' });

    adapter.setItemSync('plain', 'v');
    adapter.setItemSync('ls:pref', 'v2');
    expect(storage.getItem('plain')).toBeDefined();
    expect(storage.getItem('ls:pref')).toBeDefined();
  });

  it('falls back when storage throws a non-object error', () => {
    const storage = new FakeStorage();
    const adapter = new WebStorageAdapter(storage);
    storage.throwOnSet = () => {
      throw 'boom';
    };

    adapter.setItemSync('k', 'v');
    expect(adapter.getItemSync('k')).toBe('v');
  });

  it('evicts stale candidates and retries after a quota error', () => {
    const storage = new FakeStorage();
    storage.setItem('foreign', 'x');
    storage.setItem('ls:corrupt', 'not-json');
    storage.setItem('ls:meta', '{"value":1}');
    storage.setItem('ls:empty', '');
    const adapter = new WebStorageAdapter(storage);

    let once = true;
    storage.throwOnSet = (key) => {
      if (key === 'ls:new' && once) {
        once = false;
        throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
      }
    };

    adapter.setItemSync('new', 'value');
    expect(adapter.getItemSync('new')).toBe('value');
  });

  it('handles corrupt, non-object and expired records', () => {
    const storage = new FakeStorage();
    const adapter = new WebStorageAdapter(storage);

    storage.setItem('ls:bad', 'not-json');
    expect(adapter.getItemSync('bad')).toBeNull();
    storage.setItem('ls:scalar', '42');
    expect(adapter.getItemSync('scalar')).toBeNull();

    adapter.setItemSync('ttl', 'v', 1000);
    const spy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000);
    expect(adapter.getItemSync('ttl')).toBeNull();
    spy.mockRestore();
  });

  it('enumerates keys, strips prefix, filters and drops expired entries', async () => {
    const storage = new FakeStorage();
    const adapter = new WebStorageAdapter(storage);

    storage.setItem('foreign', 'x');
    storage.setItem('ls:empty', '');
    storage.setItem('ls:corrupt', 'bad');
    adapter.setItemSync('live', '1');
    adapter.setItemSync('old', '2', 1000);

    const spy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000);
    const all = await adapter.keys();
    expect(all).toContain('live');
    expect(all).toContain('empty');
    expect(all).not.toContain('old');
    expect(all).not.toContain('foreign');
    expect(await adapter.keys('nope')).toEqual([]);
    spy.mockRestore();
  });

  it('ignores a null key slot during enumeration and clearing', async () => {
    const storage = new FakeStorage();
    const adapter = new WebStorageAdapter(storage);
    storage.setItem('ls:spare', JSON.stringify({ value: 'x', metadata: { updatedAt: 0 } }));
    adapter.setItemSync('live', '1');
    storage.keyAt = (index) => (index === 0 ? null : Array.from(storage.map.keys())[index] ?? null);

    expect(await adapter.keys()).toContain('live');
    await adapter.clear();
    expect(await adapter.keys()).toEqual([]);
  });
});
