import { z } from 'zod';

export const createChapterFormSchema = z.object({
  story_id: z.string().min(1),
  chapter_number: z.number().int().positive(),
  title: z.string().min(1),
  content: z.string(),
});

export type CreateChapterFormInput = z.infer<typeof createChapterFormSchema>;
