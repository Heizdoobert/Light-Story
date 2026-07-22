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
