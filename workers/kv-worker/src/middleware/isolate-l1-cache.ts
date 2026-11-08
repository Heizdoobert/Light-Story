/**
 * L1 In-Memory LRU Micro-Cache for Edge Isolates.
 *
 * Keeps hot read entries in isolate memory to achieve sub-millisecond (0.1ms)
 * read latency and eliminate redundant Cloudflare KV reads within the same isolate.
 */

export interface CacheEntry {
  value: any;
  expiresAt: number;
}

export class IsolateL1Cache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Retrieve a cached item if present and not expired.
   * Access refreshes key position to preserve LRU order.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value as T;
  }

  /**
   * Store a value in L1 cache with TTL in seconds.
   * If cache exceeds maxSize, the oldest entry (FIFO/LRU) is evicted.
   */
  set<T>(key: string, value: T, ttlSec: number): void {
    if (this.maxSize <= 0 || ttlSec <= 0) {
      this.cache.delete(key);
      return;
    }

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSec * 1000,
    });
  }

  /** Delete a specific key from cache. */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /** Delete all keys that start with the given prefix. */
  deletePrefix(prefix: string): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /** Clear all cached entries. */
  clear(): void {
    this.cache.clear();
  }

  /** Current number of active entries in cache. */
  size(): number {
    return this.cache.size;
  }
}

export const l1Cache = new IsolateL1Cache(100);
