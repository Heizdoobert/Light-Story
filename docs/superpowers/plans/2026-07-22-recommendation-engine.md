# Recommendation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build content recommendation engine API and UI component for matching similar comics by categories, author, and view count popularity fallback.

**Architecture:** Add `/api/comics/recommendations` endpoint to `unified-gateway` worker, add `getRecommendations` to `comic.service.ts`, create `useRecommendations` presenter hook, and render `RecommendedComics` component on comic detail and chapter pages.

**Tech Stack:** Next.js 14, Cloudflare Workers (`unified-gateway`), @tanstack/react-query, Supabase PostgreSQL, TailwindCSS.

---

### Task 1: Add `/api/comics/recommendations` endpoint to Gateway Worker

**Files:**
- Modify: `workers/unified-gateway/src/routes/comics.ts`
- Modify: `workers/unified-gateway/src/index.ts`

- [ ] **Step 1: Write failing test / handler test for recommendations route**

Write route logic in `workers/unified-gateway/src/routes/comics.ts` handling `GET /api/comics/recommendations`:

```ts
export async function handleComicRecommendations(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const comicId = url.searchParams.get('comicId');
  const limitStr = url.searchParams.get('limit') || '6';
  const limit = parseInt(limitStr, 10) || 6;

  if (!comicId) {
    return Response.json({ success: false, error: { code: 'INVALID_INPUT', message: 'comicId parameter is required' } }, { status: 400 });
  }

  // 1. Fetch target comic
  const targetRes = await sbGet('comics', `id=eq.${comicId}&select=*`, env);
  if (!targetRes.ok) {
    return Response.json({ success: true, data: [] });
  }
  const targetData = await targetRes.json();
  const targetComic = Array.isArray(targetData) && targetData.length > 0 ? targetData[0] : null;

  if (!targetComic) {
    return Response.json({ success: true, data: [] });
  }

  // 2. Fetch candidate comics excluding target
  const candidatesRes = await sbGet('comics', `id=neq.${comicId}&status=eq.published&select=*&limit=50`, env);
  const candidatesData = candidatesRes.ok ? await candidatesRes.json() : [];
  const candidates: any[] = Array.isArray(candidatesData) ? candidatesData : [];

  const targetCategories: string[] = Array.isArray(targetComic.category)
    ? targetComic.category
    : typeof targetComic.category === 'string'
    ? JSON.parse(targetComic.category || '[]')
    : [];

  // 3. Score candidates
  const scored = candidates.map((c) => {
    const cCategories: string[] = Array.isArray(c.category)
      ? c.category
      : typeof c.category === 'string'
      ? JSON.parse(c.category || '[]')
      : [];

    const overlap = cCategories.filter((cat) => targetCategories.includes(cat)).length;
    const authorBonus = c.author && targetComic.author && c.author === targetComic.author ? 0.5 : 0;
    const score = overlap + authorBonus;

    return { ...c, _score: score };
  });

  scored.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    const viewsA = a.views || a.view_count || 0;
    const viewsB = b.views || b.view_count || 0;
    return viewsB - viewsA;
  });

  const recommendations = scored.slice(0, limit).map(({ _score, ...rest }) => rest);
  return Response.json({ success: true, data: recommendations });
}
```

- [ ] **Step 2: Dispatch route in index.ts**

In `workers/unified-gateway/src/index.ts`:

```ts
if (path === '/api/comics/recommendations' && req.method === 'GET') {
  return handleComicRecommendations(req, env);
}
```

- [ ] **Step 3: Test and Commit**

```bash
git add workers/unified-gateway/src/routes/comics.ts workers/unified-gateway/src/index.ts
git commit -m "feat(worker): add /api/comics/recommendations route handler"
```

---

### Task 2: Add `getRecommendations` to Frontend `comic.service.ts`

**Files:**
- Modify: `frontend/src/services/comic.service.ts`
- Test: `frontend/src/services/comic.service.test.ts`

- [ ] **Step 1: Write test in `comic.service.test.ts`**

```ts
it('getRecommendations calls /api/comics/recommendations', async () => {
  vi.spyOn(apiClient, 'get').mockResolvedValue([MOCK_RECORD]);
  const result = await getRecommendations('comic-1', 6);
  expect(apiClient.get).toHaveBeenCalledWith('/api/comics/recommendations?comicId=comic-1&limit=6');
});
```

- [ ] **Step 2: Implement `getRecommendations` in `comic.service.ts`**

```ts
export async function getRecommendations(comicId: string, limit = 6): Promise<ComicContext[]> {
  try {
    const res = await apiClient.get<ComicContext[]>(`/api/comics/recommendations?comicId=${encodeURIComponent(comicId)}&limit=${limit}`);
    return Array.isArray(res) ? res : [];
  } catch {
    // Fallback to top viewed comics on error
    const fallback = await apiClient.get<any>(`/api/comics?sort=most_viewed&limit=${limit}`).catch(() => []);
    return Array.isArray(fallback) ? fallback : fallback?.items || fallback?.comics || [];
  }
}
```

- [ ] **Step 3: Run unit tests to verify pass**

Run: `npm --prefix frontend run test:run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/comic.service.ts frontend/src/services/comic.service.test.ts
git commit -m "feat(frontend): add getRecommendations service function with fallback"
```

---

### Task 3: Create `RecommendedComics` Component & Hook

**Files:**
- Create: `frontend/src/hooks/useRecommendations.ts`
- Create: `frontend/src/components/shared/RecommendedComics.tsx`

- [ ] **Step 1: Implement `useRecommendations` Hook**

```ts
import { useQuery } from '@tanstack/react-query';
import { getRecommendations } from '@/services/comic.service';

export function useRecommendations(comicId: string, limit = 6) {
  return useQuery({
    queryKey: ['recommendations', comicId, limit],
    queryFn: () => getRecommendations(comicId, limit),
    enabled: !!comicId,
    staleTime: 300_000,
  });
}
```

- [ ] **Step 2: Implement `RecommendedComics.tsx` Component**

```tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { Sparkles, Eye } from 'lucide-react';
import { useRecommendations } from '@/hooks/useRecommendations';
import { getStatusStyles } from '@/lib/statusStyles';

type RecommendedComicsProps = {
  comicId: string;
};

export const RecommendedComics: React.FC<RecommendedComicsProps> = ({ comicId }) => {
  const { data: recommendations = [], isLoading } = useRecommendations(comicId);

  if (isLoading || recommendations.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Truyện đề xuất cho bạn</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {recommendations.map((comic) => (
          <Link
            key={comic.id}
            href={`/comics/${comic.id}`}
            className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 dark:border-slate-800/80"
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src={comic.coverUrl || 'https://placehold.co/300x400?text=No+Cover'}
                alt={comic.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase shadow-sm ${getStatusStyles(comic.status)}`}>
                {comic.status === 'completed' ? 'Hoàn thành' : 'Đang ra'}
              </span>
            </div>

            <div className="p-2.5 flex flex-col flex-grow">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-amber-500 transition-colors">
                {comic.title}
              </h4>
              <div className="mt-auto pt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {comic.viewCount || 0}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
```

- [ ] **Step 3: Run lint and unit tests**

Run: `npm --prefix frontend run lint && npm --prefix frontend run test:run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useRecommendations.ts frontend/src/components/shared/RecommendedComics.tsx
git commit -m "feat(frontend): create RecommendedComics component and presenter hook"
```

---

### Task 4: Integrate `RecommendedComics` onto Pages & Final Verification

**Files:**
- Modify: `frontend/src/app/comics/[comicId]/page.tsx`
- Modify: `frontend/src/app/comics/[comicId]/chapter/[chapterId]/page.tsx`

- [ ] **Step 1: Embed `<RecommendedComics comicId={comicId} />` on Comic Detail Page**

In `frontend/src/app/comics/[comicId]/page.tsx`:
Add `<RecommendedComics comicId={comicId} />` below main details card.

- [ ] **Step 2: Embed `<RecommendedComics comicId={comicId} />` on Chapter Reader Page**

In `frontend/src/app/comics/[comicId]/chapter/[chapterId]/page.tsx`:
Add `<RecommendedComics comicId={comicId} />` below chapter reader controls.

- [ ] **Step 3: Run full verification suite**

Run: `npm --prefix frontend run lint && npm --prefix frontend run test:run && npm --prefix frontend run test:integration`
Expected: ALL PASSED

- [ ] **Step 4: Commit & Update Graphify**

```bash
git add frontend/src/app/comics/[comicId]/page.tsx frontend/src/app/comics/[comicId]/chapter/[chapterId]/page.tsx
git commit -m "feat(frontend): embed RecommendedComics section on comic detail and reader pages"
graphify update .
```
