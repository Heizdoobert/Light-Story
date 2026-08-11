import { z } from "zod";

export const saveSystemSettingsSchema = z.object({
  site_title: z.string().optional(),
  site_description: z.string().optional(),
  allow_registration: z.boolean().optional(),
  maintenance_mode: z.boolean().optional(),
  items_per_page: z.number().optional(),
});

export const updateSystemSettingsSchema = saveSystemSettingsSchema;

export type SaveSystemSettingsInput = z.infer<typeof saveSystemSettingsSchema>;
