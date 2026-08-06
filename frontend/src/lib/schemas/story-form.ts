import { z } from "zod";

export const createStorySchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  description: z.string(),
  author_id: z.string().min(1).nullable(),
  category: z.string().min(1),
  cover_url: z.string().min(1),
  status: z.enum(["draft", "published", "ongoing", "completed", "archived"]),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;
