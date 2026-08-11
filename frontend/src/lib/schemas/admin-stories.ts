import { z } from "zod";

export const updateStoryStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["draft", "published", "ongoing", "completed", "archived"]),
});

export const featureStorySchema = z.object({
  id: z.string().min(1),
  isFeatured: z.boolean().optional(),
});

export const deleteStoryAdminSchema = z.object({
  id: z.string().min(1),
});

export const updateStorySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  status: z.enum(["draft", "published", "ongoing", "completed", "archived"]),
});

export const deleteStorySchema = z.object({
  id: z.string().min(1),
});

export const bulkUpdateStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  status: z.enum(["draft", "published", "ongoing", "completed", "archived"]),
});

export const bulkDeleteStoriesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export type UpdateStoryStatusInput = z.infer<typeof updateStoryStatusSchema>;
export type FeatureStoryInput = z.infer<typeof featureStorySchema>;
export type DeleteStoryAdminInput = z.infer<typeof deleteStoryAdminSchema>;
export type UpdateStoryInput = z.infer<typeof updateStorySchema>;
export type DeleteStoryInput = z.infer<typeof deleteStorySchema>;
export type BulkUpdateStatusInput = z.infer<typeof bulkUpdateStatusSchema>;
export type BulkDeleteStoriesInput = z.infer<typeof bulkDeleteStoriesSchema>;
