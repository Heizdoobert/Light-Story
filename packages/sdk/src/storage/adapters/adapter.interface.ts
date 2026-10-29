export interface StorageItemMetadata {
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  accessSeq?: number;
}

export interface StorageRecord<T = unknown> {
  value: T;
  metadata: StorageItemMetadata;
}

export interface StorageAdapterOptions {
  /**
   * Namespace prefix prepended to all storage keys.
   * Defaults to empty string or adapter default.
   */
  prefix?: string;
  /**
   * Default time-to-live in milliseconds. If omitted, items do not expire by default.
   */
  defaultTtlMs?: number;
  /**
   * Maximum number of items before LRU/FIFO eviction kicks in.
   */
  maxItems?: number;
}

/**
 * Standard asynchronous & synchronous key-value storage adapter contract.
 */
export interface StorageAdapter {
  readonly name: string;
  getItem<T = unknown>(key: string): Promise<T | null>;
  setItem<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
  has(key: string): Promise<boolean>;
  getItemSync?<T = unknown>(key: string): T | null;
  setItemSync?<T = unknown>(key: string, value: T, ttlMs?: number): void;
}
