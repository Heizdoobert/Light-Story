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
