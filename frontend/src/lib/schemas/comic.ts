import { z } from 'zod';

export const createComicSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống'),
  author: z.string().optional().default(''),
  category: z.string().optional().default(''),
  status: z
    .enum(['ongoing', 'completed', 'dropped', 'draft', 'published'])
    .default('published'),
  cover_url: z.string().optional().default(''),
});

export const updateComicSchema = createComicSchema.partial();

export type CreateComicInput = z.input<typeof createComicSchema>;
export type UpdateComicInput = z.input<typeof updateComicSchema>;
