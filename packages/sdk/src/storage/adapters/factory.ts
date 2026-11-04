import { StorageAdapter, StorageAdapterOptions } from './adapter.interface';
import { MemoryStorageAdapter } from './memory-adapter';
import { WebStorageAdapter } from './web-storage-adapter';
import { IndexedDBStorageAdapter, IndexedDBAdapterOptions } from './indexeddb-adapter';

export interface StorageFactoryOptions extends StorageAdapterOptions, IndexedDBAdapterOptions {
  type?: 'local' | 'session' | 'memory' | 'indexeddb';
  fallbackToMemory?: boolean;
}

/**
 * Creates a resilient storage adapter appropriate for the current runtime environment.
 * Gracefully falls back to MemoryStorageAdapter in SSR/Node or when browser storage is blocked.
 */
export function createStorageAdapter(options?: StorageFactoryOptions): StorageAdapter {
  const { type = 'local', fallbackToMemory = true, ...adapterOptions } = options || {};

  if (type === 'memory' || typeof window === 'undefined') {
    return new MemoryStorageAdapter(adapterOptions);
  }

  if (type === 'indexeddb') {
    if (typeof window.indexedDB !== 'undefined') {
      return new IndexedDBStorageAdapter(adapterOptions);
    }
    if (fallbackToMemory) {
      return new MemoryStorageAdapter(adapterOptions);
    }
    throw new Error('IndexedDB is not available in this environment');
  }

  try {
    const rawStorage =
      type === 'local' ? window.localStorage : window.sessionStorage;

    if (!rawStorage) {
      if (fallbackToMemory) {
        return new MemoryStorageAdapter(adapterOptions);
      }
      throw new Error(`Web storage (${type}) is not available in this environment`);
    }

    return new WebStorageAdapter(rawStorage, adapterOptions);
  } catch (err) {
    if (fallbackToMemory) {
      return new MemoryStorageAdapter(adapterOptions);
    }
    throw err;
  }
}
