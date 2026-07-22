# Image Lazy-Loading & Skeleton Loaders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `<ChapterImage />` component with lazy loading & retry, `<ComicCardSkeleton />` layout shimmer, integrate into reader page, and add unit test coverage.

**Architecture:** Create `ChapterImage.tsx` in `frontend/src/components/reader/` and `ComicCardSkeleton.tsx` in `frontend/src/components/shared/`.

**Tech Stack:** React 18, Next.js 14, Lucide icons, TailwindCSS.

---

### Task 1: Create `<ComicCardSkeleton />` Component & Test

**Files:**
- Create: `frontend/src/components/shared/ComicCardSkeleton.tsx`
- Create: `frontend/src/components/shared/ComicCardSkeleton.test.tsx`

- [ ] **Step 1: Write test in `ComicCardSkeleton.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ComicCardSkeleton } from './ComicCardSkeleton';

describe('ComicCardSkeleton', () => {
  it('renders skeleton shimmer container', () => {
    const { container } = render(<ComicCardSkeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });
});
```

- [ ] **Step 2: Implement `ComicCardSkeleton.tsx`**

```tsx
"use client";

import React from 'react';

export const ComicCardSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-800/80 flex flex-col h-full">
      <div className="aspect-[3/4] bg-slate-200 dark:bg-slate-700 w-full" />
      <div className="p-4 space-y-2 flex-1">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-1/2" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-1/3 mt-2" />
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Run unit tests**

Run: `npm --prefix frontend run test:run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/shared/ComicCardSkeleton.tsx frontend/src/components/shared/ComicCardSkeleton.test.tsx
git commit -m "feat(ui): create ComicCardSkeleton component with unit test"
```

---

### Task 2: Create `<ChapterImage />` Progressive Lazy-Loader Component & Test

**Files:**
- Create: `frontend/src/components/reader/ChapterImage.tsx`
- Create: `frontend/src/components/reader/ChapterImage.test.tsx`

- [ ] **Step 1: Write test in `ChapterImage.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChapterImage } from './ChapterImage';

describe('ChapterImage', () => {
  it('renders image element with loading="lazy"', () => {
    render(<ChapterImage src="https://example.com/page-1.jpg" alt="Trang 1" index={0} />);
    const img = screen.getByAltText('Trang 1');
    expect(img).toBeDefined();
    expect(img.getAttribute('loading')).toBe('lazy');
  });
});
```

- [ ] **Step 2: Implement `ChapterImage.tsx`**

```tsx
"use client";

import React, { useState } from 'react';
import { ImageOff, RefreshCw } from 'lucide-react';

type ChapterImageProps = {
  src: string;
  alt: string;
  index: number;
  className?: string;
};

export const ChapterImage: React.FC<ChapterImageProps> = ({ src, alt, index, className = '' }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [imgKey, setImgKey] = useState(src);

  const handleRetry = () => {
    setError(false);
    setLoaded(false);
    setRetryCount((prev) => prev + 1);
    setImgKey(`${src}?retry=${retryCount + 1}`);
  };

  return (
    <div className={`relative min-h-[300px] w-full flex items-center justify-center bg-slate-900/10 dark:bg-slate-950/40 rounded-xl overflow-hidden my-2 ${className}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-800/60 flex items-center justify-center">
          <span className="text-xs font-semibold text-slate-400">Đang tải trang {index + 1}...</span>
        </div>
      )}

      {error ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
          <ImageOff className="w-8 h-8 text-rose-400" />
          <p className="text-xs">Không thể tải trang {index + 1}</p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-medium hover:bg-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Thử lại
          </button>
        </div>
      ) : (
        <img
          key={imgKey}
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-auto transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 3: Run unit tests**

Run: `npm --prefix frontend run test:run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/reader/ChapterImage.tsx frontend/src/components/reader/ChapterImage.test.tsx
git commit -m "feat(reader): create ChapterImage progressive lazy-loader component with unit test"
```

---

### Task 3: Integrate `<ChapterImage />` into Reader Page & Verification

**Files:**
- Modify: `frontend/src/app/comics/[comicId]/chapter/[chapterId]/page.tsx`

- [ ] **Step 1: Replace raw `<img>` elements in `page.tsx` with `<ChapterImage />`**

In `frontend/src/app/comics/[comicId]/chapter/[chapterId]/page.tsx`:
Render `<ChapterImage key={idx} src={url} alt={`Trang ${idx + 1}`} index={idx} />` inside chapter image list mapping.

- [ ] **Step 2: Run full verification suite**

Run: `npm --prefix frontend run lint && npm --prefix frontend run test:run`
Expected: ALL PASSED

- [ ] **Step 3: Commit & Update Graphify**

```bash
git add frontend/src/app/comics/[comicId]/chapter/[chapterId]/page.tsx
git commit -m "feat(reader): integrate ChapterImage progressive lazy loader into reader page"
graphify update .
```
