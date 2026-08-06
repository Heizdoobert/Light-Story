import { z } from 'zod';

export const createChapterSchema = z.object({
  story_id: z.string().min(1),
  chapter_number: z.number().int().positive(),
  title: z.string().min(1),
  content: z.string(),
});

export type CreateChapterInput = z.infer<typeof createChapterSchema>;
