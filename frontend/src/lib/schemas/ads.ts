import { z } from "zod";

export const updateAdConfigSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export const updateSiteSettingSchema = updateAdConfigSchema;

export const updateAdSlotSchema = z.object({
  slot: z.string().min(1),
  code: z.string(),
});

export const toggleAdSlotSchema = z.object({
  slot: z.string().min(1).optional(),
  enabled: z.boolean(),
});

export type UpdateAdConfigInput = z.infer<typeof updateAdConfigSchema>;
export type UpdateAdSlotInput = z.infer<typeof updateAdSlotSchema>;
export type ToggleAdSlotInput = z.infer<typeof toggleAdSlotSchema>;
