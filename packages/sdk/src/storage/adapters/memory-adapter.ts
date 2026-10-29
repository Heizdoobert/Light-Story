import {
  StorageAdapter,
  StorageAdapterOptions,
  StorageRecord,
} from './adapter.interface';

export class MemoryStorageAdapter implements StorageAdapter {
  public readonly name = 'memory';
  private store = new Map<string, StorageRecord<unknown>>();
  private prefix: string;
  private defaultTtlMs?: number;
  private maxItems: number;
  private accessCounter = 0;

  constructor(options: StorageAdapterOptions = {}) {
    this.prefix = options.prefix ?? '';
    this.defaultTtlMs = options.defaultTtlMs;
    this.maxItems = Math.max(1, options.maxItems ?? 1000);
  }

  private resolveKey(key: string): string {
    return this.prefix && !key.startsWith(this.prefix) ? `${this.prefix}${key}` : key;
  }

  private stripPrefix(fullKey: string): string {
    return this.prefix && fullKey.startsWith(this.prefix)
      ? fullKey.slice(this.prefix.length)
      : fullKey;
  }

  private isExpired(record: StorageRecord<unknown>): boolean {
    return Boolean(record.metadata.expiresAt && Date.now() > record.metadata.expiresAt);
  }

  private evictOne(): void {
    // 1. Purge expired keys
    for (const [k, record] of this.store.entries()) {
      if (this.isExpired(record)) {
        this.store.delete(k);
      }
    }
    if (this.store.size < this.maxItems) {
      return;
    }

    // 2. Evict oldest entry based on accessSeq (or updatedAt)
    let oldestKey: string | null = null;
    let oldestSeq = Infinity;

    for (const [k, record] of this.store.entries()) {
      const seq = record.metadata.accessSeq ?? record.metadata.updatedAt;
      if (seq < oldestSeq) {
        oldestSeq = seq;
        oldestKey = k;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  public getItemSync<T = unknown>(key: string): T | null {
    const fullKey = this.resolveKey(key);
    const record = this.store.get(fullKey);
    if (!record) {
      return null;
    }

    if (this.isExpired(record)) {
      this.store.delete(fullKey);
      return null;
    }

    // Mark access sequence for deterministic LRU ordering
    record.metadata.updatedAt = Date.now();
    record.metadata.accessSeq = ++this.accessCounter;
    return record.value as T;
  }

  public async getItem<T = unknown>(key: string): Promise<T | null> {
    return this.getItemSync<T>(key);
  }

  public setItemSync<T = unknown>(key: string, value: T, ttlMs?: number): void {
    const fullKey = this.resolveKey(key);

    if (!this.store.has(fullKey) && this.store.size >= this.maxItems) {
      this.evictOne();
    }

    const now = Date.now();
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;
    const expiresAt =
      typeof effectiveTtl === 'number' && effectiveTtl > 0 ? now + effectiveTtl : undefined;

    this.store.set(fullKey, {
      value,
      metadata: {
        createdAt: now,
        updatedAt: now,
        expiresAt,
        accessSeq: ++this.accessCounter,
      },
    });
  }

  public async setItem<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.setItemSync<T>(key, value, ttlMs);
  }

  public async removeItem(key: string): Promise<void> {
    this.store.delete(this.resolveKey(key));
  }

  public async clear(): Promise<void> {
    if (this.prefix) {
      for (const k of Array.from(this.store.keys())) {
        if (k.startsWith(this.prefix)) {
          this.store.delete(k);
        }
      }
    } else {
      this.store.clear();
    }
  }

  public async keys(filterPrefix?: string): Promise<string[]> {
    const validKeys: string[] = [];
    const now = Date.now();

    for (const [k, record] of Array.from(this.store.entries())) {
      if (record.metadata.expiresAt && now > record.metadata.expiresAt) {
        this.store.delete(k);
        continue;
      }

      if (this.prefix && !k.startsWith(this.prefix)) {
        continue;
      }

      const stripped = this.stripPrefix(k);
      if (!filterPrefix || stripped.startsWith(filterPrefix)) {
        validKeys.push(stripped);
      }
    }

    return validKeys;
  }

  public async has(key: string): Promise<boolean> {
    return this.getItemSync(key) !== null;
  }
}
