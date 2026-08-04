import { apiClient } from "@/lib/api/client";

const BOOKMARKS_KEY = "reader:bookmarks";
const HISTORY_KEY = "reader:history";

export type HistoryItem = {
  comicId: string;
  chapterId: string;
  chapterNumber: number;
  updatedAt: string;
};

export function getLocalBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setLocalBookmarks(bookmarks: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch {
    // ignore storage errors
  }
}

export function getLocalHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setLocalHistory(history: HistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore storage errors
  }
}

export async function getBookmarks(): Promise<string[]> {
  try {
    const res = await apiClient
      .get<unknown[]>("/api/user/bookmarks")
      .catch(() => null);
    if (Array.isArray(res)) {
      return res.map((item) =>
        String(
          (item as Record<string, unknown>).comic_id ??
            (item as Record<string, unknown>).comicId ??
            String(item),
        ),
      );
    }
  } catch {
    // fall through to local
  }
  return getLocalBookmarks();
}

export async function toggleBookmark(comicId: string): Promise<boolean> {
  const bookmarks = getLocalBookmarks();
  const exists = bookmarks.includes(comicId);
  const updated = exists
    ? bookmarks.filter((id) => id !== comicId)
    : [...bookmarks, comicId];
  setLocalBookmarks(updated);
  try {
    await apiClient
      .post("/api/user/bookmarks/toggle", { comicId })
      .catch(() => null);
  } catch {
    // ignore
  }
  return !exists;
}

export async function getReadingHistory(): Promise<HistoryItem[]> {
  try {
    const res = await apiClient
      .get<unknown[]>("/api/user/history")
      .catch(() => null);
    if (Array.isArray(res)) {
      return res.map((item) => {
        const it = item as Record<string, unknown>;
        return {
          comicId: String(it.comic_id ?? it.comicId ?? ""),
          chapterId: String(it.chapter_id ?? it.chapterId ?? ""),
          chapterNumber: Number(it.chapter_number ?? it.chapterNumber ?? 1),
          updatedAt: String(
            it.updated_at ?? it.updatedAt ?? new Date().toISOString(),
          ),
        };
      });
    }
  } catch {
    // fall through to local
  }
  return getLocalHistory();
}

export async function recordReadingHistory(
  comicId: string,
  chapterId: string,
  chapterNumber: number,
) {
  try {
    await apiClient
      .post("/api/user/history", { comicId, chapterId, chapterNumber })
      .catch(() => {});
  } catch {
    // ignore
  }
  const history = getLocalHistory().filter((item) => item.comicId !== comicId);
  history.unshift({
    comicId,
    chapterId,
    chapterNumber,
    updatedAt: new Date().toISOString(),
  });
  setLocalHistory(history.slice(0, 50));
}
