import { ROUTES } from '@/lib/constants/routes';
import { apiClient } from '@/lib/api/apiClient';
import { getAccessToken } from '../comics/comic.service';
import { BookmarkListSchema, HistoryItemListSchema } from '@/types/readerHub.dto';

const BOOKMARKS_KEY = 'reader:bookmarks';
const HISTORY_KEY = 'reader:history';

export type HistoryItem = {
  comicId: string;
  chapterId: string;
  chapterNumber: number;
  updatedAt: string;
};

function getLocalBookmarks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getLocalHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalHistory(list: HistoryItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

export async function getBookmarks(): Promise<string[]> {
  try {
    const token = await getAccessToken();
    if (token) {
      const res = await apiClient.get<unknown[]>(ROUTES.API.USER.BOOKMARKS);
      const parsed = BookmarkListSchema.safeParse(Array.isArray(res) ? res : []);
      if (parsed.success) {
        return parsed.data.map((item) => item.comic_id || item.comicId || '');
      }
      // Contract violation: the worker returned data that fails boundary validation.
      // Don't silently serve stale local data as if nothing went wrong.
      console.error('[readerHub] bookmarks response failed validation', parsed.error);
    }
  } catch {
    // Network/auth failure → offline path, fall back to local cache (intentional).
  }
  return getLocalBookmarks();
}

export async function getReadingHistory(): Promise<HistoryItem[]> {
  try {
    const token = await getAccessToken();
    if (token) {
      const res = await apiClient.get<unknown[]>(ROUTES.API.USER.HISTORY);
      const parsed = HistoryItemListSchema.safeParse(Array.isArray(res) ? res : []);
      if (parsed.success) {
        return parsed.data.map((item) => ({
          comicId: item.comic_id || item.comicId || '',
          chapterId: item.chapter_id || item.chapterId || '',
          chapterNumber: item.chapter_number ?? item.chapterNumber ?? 1,
          updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
        }));
      }
      // Contract violation: worker returned data that fails boundary validation.
      console.error('[readerHub] history response failed validation', parsed.error);
    }
  } catch {
    // Network/auth failure → offline path, fall back to local cache (intentional).
  }
  return getLocalHistory();
}

export function mirrorReadingHistory(item: {
  comicId: string;
  chapterId: string;
  chapterNumber: number;
}): void {
  const { comicId, chapterId, chapterNumber } = item;
  const history = getLocalHistory().filter((h) => h.comicId !== comicId);
  const newItem: HistoryItem = {
    comicId,
    chapterId,
    chapterNumber,
    updatedAt: new Date().toISOString(),
  };
  setLocalHistory([newItem, ...history].slice(0, 50));
}