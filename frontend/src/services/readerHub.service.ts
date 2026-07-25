import { apiClient } from '@/lib/apiClient';

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

function setLocalBookmarks(list: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
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
    const res = await apiClient.get<any[]>('/api/user/bookmarks').catch(() => null);
    if (Array.isArray(res)) return res.map((item) => item.comic_id || item.comicId);
  } catch {}
  return getLocalBookmarks();
}

export async function toggleBookmark(comicId: string): Promise<boolean> {
  const local = getLocalBookmarks();
  const exists = local.includes(comicId);

  await apiClient.post('/api/user/bookmarks/toggle', { comicId }).catch(() => null);

  const updated = exists ? local.filter((id) => id !== comicId) : [...local, comicId];
  setLocalBookmarks(updated);
  return !exists;
}

export async function getReadingHistory(): Promise<HistoryItem[]> {
  try {
    const res = await apiClient.get<any[]>('/api/user/history').catch(() => null);
    if (Array.isArray(res)) {
      return res.map((item) => ({
        comicId: item.comic_id || item.comicId,
        chapterId: item.chapter_id || item.chapterId,
        chapterNumber: item.chapter_number || item.chapterNumber || 1,
        updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
      }));
    }
  } catch {}
  return getLocalHistory();
}

export async function recordReadingHistory(comicId: string, chapterId: string, chapterNumber: number): Promise<void> {
  await apiClient.post('/api/user/history', { comicId, chapterId, chapterNumber }).catch(() => {});

  const history = getLocalHistory().filter((h) => h.comicId !== comicId);
  const newItem: HistoryItem = {
    comicId,
    chapterId,
    chapterNumber,
    updatedAt: new Date().toISOString(),
  };
  setLocalHistory([newItem, ...history].slice(0, 50));
}
