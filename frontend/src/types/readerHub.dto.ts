import { z } from 'zod';

const idField = z.string().min(1, 'ID required');

// Worker responses are untrusted third-party data; validate at the boundary.
// Both snake_case (worker) and camelCase (in-memory) shapes are tolerated.
const BookmarkRowSchema = z.object({
  comicId: idField.optional(),
  comic_id: idField.optional(),
});

const HistoryItemRowSchema = z.object({
  comicId: idField.optional(),
  comic_id: idField.optional(),
  chapterId: idField.optional(),
  chapter_id: idField.optional(),
  chapterNumber: z.number().nonnegative().optional(),
  chapter_number: z.number().nonnegative().optional(),
  updatedAt: z.string().optional(),
  updated_at: z.string().optional(),
});

export const BookmarkListSchema = z.array(BookmarkRowSchema);

export const HistoryItemListSchema = z.array(HistoryItemRowSchema);
