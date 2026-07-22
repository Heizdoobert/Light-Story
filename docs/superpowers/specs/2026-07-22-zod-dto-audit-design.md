# DTO & Zod Schema Validation Audit Design Spec

## Overview
Validation audit establishing a centralized DTO validation helper `frontend/src/types/readerHub.dto.ts` with Zod schemas for `BookmarkDTO` and `HistoryItemDTO`, enforcing strict runtime validation and type inferencing across service layers.

## Architecture & Data Flow

### 1. Zod DTO Schema Definitions (`frontend/src/types/readerHub.dto.ts`)
```ts
import { z } from 'zod';

export const BookmarkDTOSchema = z.object({
  comicId: z.string().min(1, 'Comic ID required'),
});

export const HistoryItemDTOSchema = z.object({
  comicId: z.string().min(1, 'Comic ID required'),
  chapterId: z.string().min(1, 'Chapter ID required'),
  chapterNumber: z.number().positive(),
  progressPct: z.number().min(0).max(100).optional(),
  updatedAt: z.string().optional(),
});

export type BookmarkDTO = z.infer<typeof BookmarkDTOSchema>;
export type HistoryItemDTO = z.infer<typeof HistoryItemDTOSchema>;
```

### 2. Integration into `readerHub.service.ts`
Validate incoming API and localStorage DTO objects using `HistoryItemDTOSchema.safeParse()` and `BookmarkDTOSchema.safeParse()`.

## Testing Strategy
- Unit tests for DTO validation parsing in `readerHub.dto.test.ts`.
- Frontend linting and test execution (`npm --prefix frontend run lint && npm --prefix frontend run test:run`).
