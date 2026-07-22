# DTO & Zod Schema Validation Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `readerHub.dto.ts` with Zod schemas for reader hub DTOs, integrate into `readerHub.service.ts`, and write unit tests.

**Architecture:** Create `readerHub.dto.ts` in `frontend/src/types/`, update `readerHub.service.ts` to validate using Zod `safeParse()`.

---

### Task 1: Create `readerHub.dto.ts` and Unit Tests

**Files:**
- Create: `frontend/src/types/readerHub.dto.ts`
- Create: `frontend/src/types/readerHub.dto.test.ts`

- [ ] **Step 1: Write test in `readerHub.dto.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { BookmarkDTOSchema, HistoryItemDTOSchema } from './readerHub.dto';

describe('readerHub.dto - Zod Validation', () => {
  it('validates valid BookmarkDTO', () => {
    const res = BookmarkDTOSchema.safeParse({ comicId: 'comic-123' });
    expect(res.success).toBe(true);
  });

  it('rejects invalid HistoryItemDTO missing chapterId', () => {
    const res = HistoryItemDTOSchema.safeParse({ comicId: 'comic-123', chapterNumber: 1 });
    expect(res.success).toBe(false);
  });
});
```

- [ ] **Step 2: Implement `readerHub.dto.ts`**

```ts
import { z } from 'zod';

export const BookmarkDTOSchema = z.object({
  comicId: z.string().min(1, 'Comic ID required'),
});

export const HistoryItemDTOSchema = z.object({
  comicId: z.string().min(1, 'Comic ID required'),
  chapterId: z.string().min(1, 'Chapter ID required'),
  chapterNumber: z.number().positive('Chapter number must be positive'),
  progressPct: z.number().min(0).max(100).optional(),
  updatedAt: z.string().optional(),
});

export type BookmarkDTO = z.infer<typeof BookmarkDTOSchema>;
export type HistoryItemDTO = z.infer<typeof HistoryItemDTOSchema>;
```

- [ ] **Step 3: Run unit tests**

Run: `npm --prefix frontend run test:run`
Expected: PASS

- [ ] **Step 4: Commit & Update Graphify**

```bash
git add frontend/src/types/readerHub.dto.ts frontend/src/types/readerHub.dto.test.ts
git commit -m "feat(types): create Zod schemas for readerHub DTO validation"
graphify update .
```
