import { StorageAdapter, StorageAdapterOptions } from './adapter.interface';
import { MemoryStorageAdapter } from './memory-adapter';
import { WebStorageAdapter } from './web-storage-adapter';

export interface StorageFactoryOptions extends StorageAdapterOptions {
  type?: 'local' | 'session' | 'memory';
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
