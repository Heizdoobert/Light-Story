import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createStorageAdapter,
  IndexedDBStorageAdapter,
  MemoryStorageAdapter,
  WebStorageAdapter,
} from '../storage/adapters';
import { loadComponent } from '../loader';

function fakeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => { store.delete(key); },
    setItem: (key: string, value: string) => { store.set(key, value); },
  } as Storage;
}

function setWindow(value: Record<string, unknown> | undefined): void {
  vi.stubGlobal('window', value === undefined ? undefined : (value as Window & typeof globalThis));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('createStorageAdapter', () => {
  it('uses memory when there is no window or type is memory', () => {
    setWindow(undefined);
    expect(createStorageAdapter()).toBeInstanceOf(MemoryStorageAdapter);
    setWindow({ localStorage: fakeStorage() });
    expect(createStorageAdapter({ type: 'memory' })).toBeInstanceOf(MemoryStorageAdapter);
  });

  it('picks indexeddb when available and falls back when it is not', () => {
    setWindow({ indexedDB: {} });
    expect(createStorageAdapter({ type: 'indexeddb' })).toBeInstanceOf(IndexedDBStorageAdapter);
    setWindow({});
    expect(createStorageAdapter({ type: 'indexeddb' })).toBeInstanceOf(MemoryStorageAdapter);
    expect(() => createStorageAdapter({ type: 'indexeddb', fallbackToMemory: false }))
      .toThrow('IndexedDB is not available in this environment');
  });

  it('uses local and session web storage', () => {
    const local = fakeStorage();
    const session = fakeStorage();
    setWindow({ localStorage: local, sessionStorage: session });
    expect(createStorageAdapter()).toBeInstanceOf(WebStorageAdapter);
    expect(createStorageAdapter({ type: 'session' })).toBeInstanceOf(WebStorageAdapter);
  });

  it('falls back for missing or throwing web storage', () => {
    setWindow({});
    expect(createStorageAdapter()).toBeInstanceOf(MemoryStorageAdapter);
    expect(() => createStorageAdapter({ fallbackToMemory: false }))
      .toThrow('Web storage (local) is not available in this environment');
    setWindow({
      get localStorage() { throw new Error('blocked'); },
    });
    expect(createStorageAdapter()).toBeInstanceOf(MemoryStorageAdapter);
    expect(() => createStorageAdapter({ fallbackToMemory: false })).toThrow('blocked');
  });
});

const DATA_ORIGIN = "data:text/javascript,export default 'chunk';export const Widget='fallback';//";

function stubFetch(
  response: { ok: boolean; json?: () => Promise<Record<string, string>> } | Error,
): void {
  const fetchMock = response instanceof Error
    ? vi.fn().mockRejectedValue(response)
    : vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
}

describe('loadComponent', () => {
  it('returns null without a browser window', async () => {
    setWindow(undefined);
    await expect(loadComponent('Widget')).resolves.toBeNull();
  });

  it('imports the manifest chunk and returns its default export', async () => {
    setWindow({ location: { origin: DATA_ORIGIN } });
    stubFetch({ ok: true, json: async () => ({ Widget: '../chunk.mjs' }) });
    await expect(loadComponent('Widget')).resolves.toBe('chunk');
  });

  it('falls back to the full bundle when manifest fetch or validation fails', async () => {
    setWindow({ location: { origin: DATA_ORIGIN } });
    stubFetch(new Error('offline'));
    await expect(loadComponent('Widget')).resolves.toBe('fallback');

    stubFetch({ ok: false });
    await expect(loadComponent('Widget')).resolves.toBe('fallback');

    stubFetch({ ok: true, json: async () => ({}) });
    await expect(loadComponent('Widget')).resolves.toBe('fallback');
  });

  it('returns null when both the chunk and fallback imports fail', async () => {
    setWindow({ location: { origin: "data:text/javascript,throw new Error('boom');//" } });
    stubFetch({ ok: true, json: async () => ({ Widget: '../chunk.mjs' }) });
    await expect(loadComponent('Widget')).resolves.toBeNull();
  });
});
