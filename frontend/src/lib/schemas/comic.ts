import { z } from 'zod';

export const COMIC_STATUSES = [
  'draft',
  'published',
  'ongoing',
  'completed',
  'archived',
] as const;

export const createComicSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống'),
  author: z.string().optional().default(''),
  translator: z.string().optional().default(''),
  category: z.string().optional().default(''),
  description: z.string().optional().default(''),
  status: z.enum(COMIC_STATUSES).default('published'),
  cover_url: z.string().optional().default(''),
  slug: z.string().optional().default(''),
});

export const updateComicSchema = createComicSchema.partial();

export type CreateComicInput = z.input<typeof createComicSchema>;
export type UpdateComicInput = z.input<typeof updateComicSchema>;
