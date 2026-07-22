# User Reader Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Bookmarks & Reading History functionality with dual storage (localStorage fallback for guests, Supabase REST API sync for logged in users), presenter hooks, and UI components.

**Architecture:** Create `readerHub.service.ts` for dual-storage abstraction, `useBookmarks` & `useReadingHistory` presenter hooks, `<BookmarkButton />` component, and `<ReadingHistoryDrawer />` component.

**Tech Stack:** Next.js 14, Supabase JS Client / REST API, @tanstack/react-query, Lucide icons, TailwindCSS.

---

### Task 1: Create `readerHub.service.ts` Dual Storage Layer

**Files:**
- Create: `frontend/src/services/readerHub.service.ts`
- Create: `frontend/src/services/readerHub.service.test.ts`

- [ ] **Step 1: Write failing test in `readerHub.service.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getBookmarks, toggleBookmark, getReadingHistory, recordReadingHistory } from './readerHub.service';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('readerHub.service - LocalStorage Fallback', () => {
  it('toggles bookmark in localStorage when guest', async () => {
    const isBookmarked = await toggleBookmark('comic-101');
    expect(isBookmarked).toBe(true);

    const list = await getBookmarks();
    expect(list).toContain('comic-101');

    const toggledOff = await toggleBookmark('comic-101');
    expect(toggledOff).toBe(false);
  });

  it('records reading history in localStorage when guest', async () => {
    await recordReadingHistory('comic-101', 'chap-5', 5);
    const history = await getReadingHistory();
    expect(history).toHaveLength(1);
    expect(history[0].comicId).toBe('comic-101');
    expect(history[0].chapterNumber).toBe(5);
  });
});
```

- [ ] **Step 2: Implement `readerHub.service.ts`**

```ts
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
  const updated = exists ? local.filter((id) => id !== comicId) : [...local, comicId];
  setLocalBookmarks(updated);

  try {
    await apiClient.post('/api/user/bookmarks/toggle', { comicId }).catch(() => null);
  } catch {}

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
  const history = getLocalHistory().filter((h) => h.comicId !== comicId);
  const newItem: HistoryItem = {
    comicId,
    chapterId,
    chapterNumber,
    updatedAt: new Date().toISOString(),
  };
  setLocalHistory([newItem, ...history].slice(0, 50));

  try {
    await apiClient.post('/api/user/history', { comicId, chapterId, chapterNumber }).catch(() => null);
  } catch {}
}
```

- [ ] **Step 3: Run unit test to verify pass**

Run: `npm --prefix frontend run test:run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/readerHub.service.ts frontend/src/services/readerHub.service.test.ts
git commit -m "feat(reader): implement readerHub dual-storage service"
```

---

### Task 2: Create Presenter Hooks `useBookmarks` & `useReadingHistory`

**Files:**
- Create: `frontend/src/hooks/useBookmarks.ts`
- Create: `frontend/src/hooks/useReadingHistory.ts`

- [ ] **Step 1: Create `useBookmarks.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBookmarks, toggleBookmark } from '@/services/readerHub.service';

export function useBookmarks() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bookmarks'],
    queryFn: getBookmarks,
    staleTime: 60_000,
  });

  const toggleMutation = useMutation({
    mutationFn: toggleBookmark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });

  return {
    bookmarks: query.data ?? [],
    isLoading: query.isLoading,
    isBookmarked: (comicId: string) => (query.data ?? []).includes(comicId),
    toggleBookmark: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
  };
}
```

- [ ] **Step 2: Create `useReadingHistory.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReadingHistory, recordReadingHistory } from '@/services/readerHub.service';

export function useReadingHistory() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['reading-history'],
    queryFn: getReadingHistory,
    staleTime: 30_000,
  });

  const recordMutation = useMutation({
    mutationFn: ({ comicId, chapterId, chapterNumber }: { comicId: string; chapterId: string; chapterNumber: number }) =>
      recordReadingHistory(comicId, chapterId, chapterNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-history'] });
    },
  });

  return {
    history: query.data ?? [],
    isLoading: query.isLoading,
    recordHistory: recordMutation.mutate,
  };
}
```

- [ ] **Step 3: Run linting**

Run: `npm --prefix frontend run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useBookmarks.ts frontend/src/hooks/useReadingHistory.ts
git commit -m "feat(reader): create useBookmarks and useReadingHistory presenter hooks"
```

---

### Task 3: Create UI Components `<BookmarkButton />` and `<ReadingHistoryDrawer />`

**Files:**
- Create: `frontend/src/components/shared/BookmarkButton.tsx`
- Create: `frontend/src/components/shared/ReadingHistoryDrawer.tsx`

- [ ] **Step 1: Create `BookmarkButton.tsx`**

```tsx
"use client";

import React from 'react';
import { Bookmark } from 'lucide-react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { toast } from 'sonner';

type BookmarkButtonProps = {
  comicId: string;
  className?: string;
};

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({ comicId, className = '' }) => {
  const { isBookmarked, toggleBookmark, isToggling } = useBookmarks();
  const bookmarked = isBookmarked(comicId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const state = await toggleBookmark(comicId);
      toast.success(state ? 'Đã thêm vào danh sách theo dõi!' : 'Đã bỏ theo dõi!');
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isToggling}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all border-2 ${
        bookmarked
          ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-500 hover:text-amber-500'
      } ${className}`}
    >
      <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
      <span>{bookmarked ? 'Đang theo dõi' : 'Theo dõi'}</span>
    </button>
  );
};
```

- [ ] **Step 2: Create `ReadingHistoryDrawer.tsx`**

```tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { History, X, BookOpen } from 'lucide-react';
import { useReadingHistory } from '@/hooks/useReadingHistory';

type ReadingHistoryDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const ReadingHistoryDrawer: React.FC<ReadingHistoryDrawerProps> = ({ isOpen, onClose }) => {
  const { history, isLoading } = useReadingHistory();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-lg">
            <History className="w-5 h-5 text-primary" />
            <span>Lịch sử đọc truyện</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {isLoading ? (
            <p className="text-slate-400 text-center py-8">Đang tải...</p>
          ) : history.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Bạn chưa đọc truyện nào.</p>
          ) : (
            history.map((item) => (
              <Link
                key={`${item.comicId}-${item.chapterId}`}
                href={`/comics/${item.comicId}/chapter/${item.chapterId}`}
                onClick={onClose}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-primary transition line-clamp-1">
                      {item.comicId}
                    </h4>
                    <p className="text-[11px] text-slate-400">Đã đọc Chương {item.chapterNumber}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Run linting and unit tests**

Run: `npm --prefix frontend run lint && npm --prefix frontend run test:run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/shared/BookmarkButton.tsx frontend/src/components/shared/ReadingHistoryDrawer.tsx
git commit -m "feat(reader): create BookmarkButton and ReadingHistoryDrawer UI components"
```

---

### Task 4: Integrate BookmarkButton & Reading History into Layout and Verification

**Files:**
- Modify: `frontend/src/app/comics/[comicId]/page.tsx`
- Modify: `frontend/src/app/comics/[comicId]/chapter/[chapterId]/page.tsx`

- [ ] **Step 1: Embed `<BookmarkButton comicId={comicId} />` on Comic Detail Page**

In `frontend/src/app/comics/[comicId]/page.tsx`:
Add `<BookmarkButton comicId={comicId} />` next to "Đọc từ đầu" / "Đọc mới nhất" buttons.

- [ ] **Step 2: Auto-record reading history on Chapter Reader Page**

In `frontend/src/app/comics/[comicId]/chapter/[chapterId]/page.tsx`:
Call `recordReadingHistory(comicId, chapterId, currentChapter.chapter_number)` inside chapter detail `useEffect`.

- [ ] **Step 3: Run full verification suite**

Run: `npm --prefix frontend run lint && npm --prefix frontend run test:run && npm --prefix frontend run test:integration`
Expected: ALL PASSED

- [ ] **Step 4: Commit & Update Graphify**

```bash
git add frontend/src/app/comics/[comicId]/page.tsx frontend/src/app/comics/[comicId]/chapter/[chapterId]/page.tsx
git commit -m "feat(reader): integrate BookmarkButton and auto-record history on reader page"
graphify update .
```
