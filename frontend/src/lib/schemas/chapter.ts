import { z } from "zod";

export const createChapterSchema = z.object({
  comic_id: z.string().min(1, "ID truyện không được để trống"),
  title: z.string().min(1, "Tên chương không được để trống"),
  chapter_number: z.number().min(0, "Số chương phải lớn hơn hoặc bằng 0"),
  order: z.number().optional().default(0),
  images: z.array(z.string()).optional().default([]),
});

export const updateChapterSchema = createChapterSchema.partial();

export type CreateChapterInput = z.input<typeof createChapterSchema>;
export type UpdateChapterInput = z.input<typeof updateChapterSchema>;
