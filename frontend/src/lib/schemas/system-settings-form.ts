import { z } from 'zod';

export const saveSystemSettingsSchema = z.object({
  compactMode: z.boolean(),
  showSyncBadge: z.boolean(),
  dashboardTabVisibility: z.record(z.string(), z.array(z.string())),
  sidebarMenuVisibility: z.record(z.string(), z.array(z.string())),
});

export const updateSystemSettingsSchema = saveSystemSettingsSchema;

export type SaveSystemSettingsInput = z.infer<typeof saveSystemSettingsSchema>;
export type UpdateSystemSettingsInput = z.infer<typeof updateSystemSettingsSchema>;
