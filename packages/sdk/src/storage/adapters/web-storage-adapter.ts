import {
  StorageAdapter,
  StorageAdapterOptions,
  StorageRecord,
} from './adapter.interface';
import { MemoryStorageAdapter } from './memory-adapter';

function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const errorObj = err as { name?: string; code?: number; number?: number };
  return (
    errorObj.name === 'QuotaExceededError' ||
    errorObj.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    errorObj.code === 22 ||
    errorObj.code === 1014 ||
    errorObj.number === -2147024882
  );
}

export class WebStorageAdapter implements StorageAdapter {
  public readonly name: string;
  private storage: Storage | null = null;
  private fallback: MemoryStorageAdapter;
  private prefix: string;
  private defaultTtlMs?: number;
  private isAvailable = false;

  constructor(storage?: Storage | null, options: StorageAdapterOptions = {}) {
    this.name = storage === (typeof window !== 'undefined' ? window.sessionStorage : null)
      ? 'sessionStorage'
      : 'localStorage';
    this.prefix = options.prefix ?? 'ls:';
    this.defaultTtlMs = options.defaultTtlMs;
    this.fallback = new MemoryStorageAdapter(options);

    if (storage) {
      try {
        const canary = `__ls_canary_${Math.random().toString(36).substring(2, 7)}__`;
        storage.setItem(canary, '1');
        storage.removeItem(canary);
        this.storage = storage;
        this.isAvailable = true;
      } catch {
        this.storage = null;
        this.isAvailable = false;
      }
    }
  }

  private resolveKey(key: string): string {
    return this.prefix && !key.startsWith(this.prefix) ? `${this.prefix}${key}` : key;
  }

  private stripPrefix(fullKey: string): string {
    return this.prefix && fullKey.startsWith(this.prefix)
      ? fullKey.slice(this.prefix.length)
      : fullKey;
  }

  private evictLru(): boolean {
    if (!this.storage) return false;
    try {
      const candidates: Array<{ key: string; updatedAt: number }> = [];

      for (let i = 0; i < this.storage.length; i++) {
        const rawKey = this.storage.key(i);
        if (rawKey && rawKey.startsWith(this.prefix)) {
          try {
            const rawVal = this.storage.getItem(rawKey);
            if (rawVal) {
              const parsed = JSON.parse(rawVal) as StorageRecord<unknown>;
              candidates.push({
                key: rawKey,
                updatedAt: parsed?.metadata?.updatedAt ?? 0,
              });
            }
          } catch {
            candidates.push({ key: rawKey, updatedAt: 0 });
          }
        }
      }

      if (candidates.length === 0) return false;

      // Sort ascending (oldest first)
      candidates.sort((a, b) => a.updatedAt - b.updatedAt);

      // Evict oldest 20% (at least 1)
      const evictCount = Math.max(1, Math.ceil(candidates.length * 0.2));
      for (let i = 0; i < evictCount; i++) {
        this.storage.removeItem(candidates[i].key);
      }
      return true;
    } catch {
      return false;
    }
  }

  public getItemSync<T = unknown>(key: string): T | null {
    if (!this.isAvailable || !this.storage) {
      return this.fallback.getItemSync<T>(key);
    }

    const fullKey = this.resolveKey(key);
    try {
      const raw = this.storage.getItem(fullKey);
      if (!raw) {
        return this.fallback.getItemSync<T>(key);
      }

      const record = JSON.parse(raw) as StorageRecord<T>;
      if (!record || typeof record !== 'object') {
        return null;
      }

      if (record.metadata?.expiresAt && Date.now() > record.metadata.expiresAt) {
        this.storage.removeItem(fullKey);
        return null;
      }

      // Update LRU access timestamp
      record.metadata.updatedAt = Date.now();
      try {
        this.storage.setItem(fullKey, JSON.stringify(record));
      } catch {
        // Best-effort update
      }

      return record.value;
    } catch {
      return this.fallback.getItemSync<T>(key);
    }
  }

  public async getItem<T = unknown>(key: string): Promise<T | null> {
    return this.getItemSync<T>(key);
  }

  public setItemSync<T = unknown>(key: string, value: T, ttlMs?: number): void {
    if (!this.isAvailable || !this.storage) {
      this.fallback.setItemSync<T>(key, value, ttlMs);
      return;
    }

    const fullKey = this.resolveKey(key);
    const now = Date.now();
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;
    const expiresAt =
      typeof effectiveTtl === 'number' && effectiveTtl > 0 ? now + effectiveTtl : undefined;

    const payload: StorageRecord<T> = {
      value,
      metadata: {
        createdAt: now,
        updatedAt: now,
        expiresAt,
      },
    };

    try {
      this.storage.setItem(fullKey, JSON.stringify(payload));
    } catch (err) {
      if (isQuotaError(err)) {
        const evicted = this.evictLru();
        if (evicted) {
          try {
            this.storage.setItem(fullKey, JSON.stringify(payload));
            return;
          } catch {
            // Still failing after eviction
          }
        }
      }
      // Graceful fallback to memory
      this.fallback.setItemSync<T>(key, value, ttlMs);
    }
  }

  public async setItem<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.setItemSync<T>(key, value, ttlMs);
  }

  public async removeItem(key: string): Promise<void> {
    const fullKey = this.resolveKey(key);
    if (this.isAvailable && this.storage) {
      try {
        this.storage.removeItem(fullKey);
      } catch {
        // Silently catch
      }
    }
    await this.fallback.removeItem(key);
  }

  public async clear(): Promise<void> {
    if (this.isAvailable && this.storage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < this.storage.length; i++) {
          const rawKey = this.storage.key(i);
          if (rawKey && rawKey.startsWith(this.prefix)) {
            keysToRemove.push(rawKey);
          }
        }
        for (const k of keysToRemove) {
          this.storage.removeItem(k);
        }
      } catch {
        // Silently catch
      }
    }
    await this.fallback.clear();
  }

  public async keys(filterPrefix?: string): Promise<string[]> {
    const keySet = new Set<string>();

    if (this.isAvailable && this.storage) {
      try {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (let i = 0; i < this.storage.length; i++) {
          const rawKey = this.storage.key(i);
          if (!rawKey || !rawKey.startsWith(this.prefix)) continue;

          try {
            const rawVal = this.storage.getItem(rawKey);
            if (rawVal) {
              const parsed = JSON.parse(rawVal) as StorageRecord<unknown>;
              if (parsed?.metadata?.expiresAt && now > parsed.metadata.expiresAt) {
                expiredKeys.push(rawKey);
                continue;
              }
            }
          } catch {
            // Treat unparseable as key to keep
          }

          const stripped = this.stripPrefix(rawKey);
          if (!filterPrefix || stripped.startsWith(filterPrefix)) {
            keySet.add(stripped);
          }
        }

        for (const k of expiredKeys) {
          try {
            this.storage.removeItem(k);
          } catch {
            // Ignore
          }
        }
      } catch {
        // Ignore
      }
    }

    const fallbackKeys = await this.fallback.keys(filterPrefix);
    for (const k of fallbackKeys) {
      keySet.add(k);
    }

    return Array.from(keySet);
  }

  public async has(key: string): Promise<boolean> {
    return this.getItemSync(key) !== null;
  }
}
