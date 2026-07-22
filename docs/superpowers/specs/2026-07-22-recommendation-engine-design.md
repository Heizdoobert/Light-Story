# Recommendation Engine Design Spec

## Overview
Content discovery system providing personalized comic recommendations based on category similarity, author matching, and view trend popularity fallback.

## Architecture & Data Flow

### 1. API Route
- `GET /api/comics/recommendations`
- Query Params:
  - `comicId` (string, required): Current comic ID to find recommendations for.
  - `limit` (number, default: 6): Number of recommended items.

### 2. Scoring Algorithm
Each candidate comic in database evaluated:
1. `Category Score`: Overlapping categories count / total categories count (Jaccard index).
2. `Author Score`: +0.5 bonus if same author.
3. `Popularity Fallback`: If fewer than `limit` matches, fill remaining slots with highest `view_count` comics excluding current `comicId`.

### 3. Data Flow
```
[UI Component: RecommendedComics]
         │
         ▼
[useRecommendations Hook (React Query)]
         │
         ▼
[apiClient: GET /api/comics/recommendations]
         │
         ▼
[unified-gateway Worker: /routes/comics.ts]
         │
         ▼
[Supabase REST API: comics table query]
```

## Component & Service Interface

### Frontend Hook
`useRecommendations(comicId: string, category?: string[])`
- Cache time: 5 minutes (`staleTime: 300_000`).
- Fallback: On error, returns top trending comics array.

### UI Component
`RecommendedComics.tsx` located in `frontend/src/components/shared/`:
- Responsive grid (2 cols mobile, 3 tablet, 6 desktop).
- Card displays cover thumbnail, title, category tags, view count badge.

## Error Handling & Resiliency
- Silent fallback to trending comics if algorithm returns empty result.
- Error boundary wrapper prevents page crashes if recommendation API fails.

## Testing Strategy
- Unit test for recommendation filtering logic in `services/comic.service.test.ts`.
- Component render test in `components/shared/RecommendedComics.test.tsx`.
