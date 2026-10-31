import { StorageAdapter } from '../adapters/adapter.interface';

export interface ReadingProgressRecord {
  comicId: string;
  chapterId: string;
  chapterNumber: number;
  scrollPosition?: number;
  progressPercent?: number; // 0 - 100
  updatedAt: string;        // ISO 8601 UTC
  synced: boolean;          // true if acknowledged by remote gateway
}

export interface ProgressSyncOptions {
  storage?: StorageAdapter;
  debounceMs?: number;      // Default: 1000ms
  maxHistoryItems?: number; // Default: 100 items
  onSyncSuccess?: (records: ReadingProgressRecord[]) => void;
  onSyncError?: (error: unknown) => void;
}

export interface BookmarkRecord {
  comicId: string;
  chapterId?: string;
  chapterNumber?: number;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  synced: boolean;
}

export interface BookmarkSyncOptions {
  storage?: StorageAdapter;
  onSyncSuccess?: () => void;
  onSyncError?: (error: unknown) => void;
}

export interface BookmarkMutation {
  type: 'ADD' | 'REMOVE';
  comicId: string;
  chapterId?: string;
  chapterNumber?: number;
  timestamp: number;
}
