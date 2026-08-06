import { z } from 'zod';

export const siteSettingEntrySchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export const saveSiteSettingsSchema = z.object({
  entries: z.array(siteSettingEntrySchema).min(1),
});

export type SiteSettingEntry = z.input<typeof siteSettingEntrySchema>;
export type SaveSiteSettingsInput = z.input<typeof saveSiteSettingsSchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Tên thể loại không được để trống'),
  slug: z.string().optional().default(''),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.input<typeof createCategorySchema>;
export type UpdateCategoryInput = z.input<typeof updateCategorySchema>;