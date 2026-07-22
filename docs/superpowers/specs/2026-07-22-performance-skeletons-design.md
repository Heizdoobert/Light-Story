# Image Lazy-Loading & Skeleton Loaders Design Spec

## Overview
Performance and UX improvement component suite featuring progressive lazy-loaded chapter images with placeholder blur-up, along with animated skeleton shimmer loaders for comic cards and chapter reader layouts.

## Components Design

### 1. `<ChapterImage />` Component
Location: `frontend/src/components/reader/ChapterImage.tsx`

Features:
- IntersectionObserver native/custom lazy loading.
- Low-res placeholder / shimmer container while image loads.
- Automatic retry on load failure (up to 3 retries).
- Fallback placeholder image when image fails to load permanently.

### 2. `<ComicCardSkeleton />` Component
Location: `frontend/src/components/shared/ComicCardSkeleton.tsx`

Features:
- Pulse / Shimmer animation matching exact dimensions of `<ComicCard />`.
- Supports grid layout rendering (e.g., render 6-12 cards during fetch).

### 3. Page Integration
- Embed `<ChapterImage />` inside chapter reader page (`frontend/src/app/comics/[comicId]/chapter/[chapterId]/page.tsx`).
- Embed `<ComicCardSkeleton />` in comic list loading states.

## Component & Service Interface

```tsx
type ChapterImageProps = {
  src: string;
  alt: string;
  index: number;
  className?: string;
};
```

## Testing Strategy
- Unit tests for `<ChapterImage />` (renders skeleton initially, handles load/error states).
- Unit tests for `<ComicCardSkeleton />`.
