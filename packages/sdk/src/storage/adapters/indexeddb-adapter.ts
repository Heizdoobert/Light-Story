import {
  StorageAdapter,
  StorageAdapterOptions,
  StorageRecord,
} from './adapter.interface';

export interface IndexedDBAdapterOptions extends StorageAdapterOptions {
  dbName?: string;
  storeName?: string;
  version?: number;
}

/**
 * Resilient, zero-runtime-dependency IndexedDB storage adapter for @light-story/sdk.
 * Designed for handling high-volume comic chapters, reader state, and offline assets.
 */
export class IndexedDBStorageAdapter implements StorageAdapter {
  readonly name = 'indexeddb';
  private readonly dbName: string;
  private readonly storeName: string;
  private readonly version: number;
  private readonly prefix: string;
  private readonly defaultTtlMs?: number;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(options: IndexedDBAdapterOptions = {}) {
    this.dbName = options.dbName ?? 'light_story_db';
    this.storeName = options.storeName ?? 'keyvalue_pairs';
    this.version = options.version ?? 1;
    this.prefix = options.prefix ?? '';
    this.defaultTtlMs = options.defaultTtlMs;
  }

  private isSupported(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  private getDB(): Promise<IDBDatabase> {
    if (!this.isSupported()) {
      return Promise.reject(
        new Error('IndexedDB is not supported in the current environment (SSR/Node)'),
      );
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        // Invalidate cached connection if closed unexpectedly
        db.onclose = () => {
          this.dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error ?? new Error('Failed to open IndexedDB'));
      };

      request.onblocked = () => {
        this.dbPromise = null;
        reject(new Error('IndexedDB open request was blocked'));
      };
    });

    return this.dbPromise;
  }

  private prefixKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  private unprefixKey(fullKey: string): string {
    if (!this.prefix) return fullKey;
    const prefixStr = `${this.prefix}:`;
    return fullKey.startsWith(prefixStr) ? fullKey.slice(prefixStr.length) : fullKey;
  }

  async getItem<T = unknown>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      const fullKey = this.prefixKey(key);

      return new Promise<T | null>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(fullKey);

        request.onsuccess = () => {
          const record = request.result as StorageRecord<T> | undefined;
          if (!record) {
            resolve(null);
            return;
          }

          // Check TTL expiration
          if (record.metadata?.expiresAt && Date.now() > record.metadata.expiresAt) {
            // Lazy delete expired item in background
            this.removeItem(key).catch(() => {});
            resolve(null);
            return;
          }

          resolve(record.value);
        };

        request.onerror = () => reject(request.error ?? new Error('IndexedDB get error'));
      });
    } catch {
      return null;
    }
  }

  async setItem<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void> {
    const db = await this.getDB();
    const fullKey = this.prefixKey(key);
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;
    const now = Date.now();

    const record: StorageRecord<T> = {
      value,
      metadata: {
        createdAt: now,
        updatedAt: now,
        expiresAt: effectiveTtl ? now + effectiveTtl : undefined,
      },
    };

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(record, fullKey);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('IndexedDB put error'));
    });
  }

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      const fullKey = this.prefixKey(key);

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(fullKey);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error('IndexedDB delete error'));
      });
    } catch {
      // Gracefully resolve on error for idempotent deletes
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB();

      // If a prefix is configured, selectively delete matching keys only
      if (this.prefix) {
        const matchingKeys = await this.keys();
        await Promise.all(matchingKeys.map((k) => this.removeItem(k)));
        return;
      }

      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error('IndexedDB clear error'));
      });
    } catch {
      // Gracefully resolve on error
    }
  }

  async keys(prefix?: string): Promise<string[]> {
    try {
      const db = await this.getDB();

      return new Promise<string[]>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAllKeys();

        request.onsuccess = () => {
          const allKeys = (request.result as IDBValidKey[]).map(String);

          // Filter by internal adapter prefix first
          const adapterKeys = allKeys
            .filter((k) => !this.prefix || k.startsWith(`${this.prefix}:`))
            .map((k) => this.unprefixKey(k));

          // Filter by user-requested query prefix if specified
          const result = prefix
            ? adapterKeys.filter((k) => k.startsWith(prefix))
            : adapterKeys;

          resolve(result);
        };

        request.onerror = () => reject(request.error ?? new Error('IndexedDB getAllKeys error'));
      });
    } catch {
      return [];
    }
  }

  async has(key: string): Promise<boolean> {
    const item = await this.getItem(key);
    return item !== null;
  }
}
