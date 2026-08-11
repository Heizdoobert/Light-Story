import { z } from 'zod';

export const saveAdminUiSettingsSchema = z.object({
  compactMode: z.boolean(),
  showSyncBadge: z.boolean(),
  dashboardTabVisibility: z.record(z.string(), z.array(z.string())),
  sidebarMenuVisibility: z.record(z.string(), z.array(z.string())),
});

export const updateAdminUiSettingsSchema = saveAdminUiSettingsSchema;

export type SaveAdminUiSettingsInput = z.infer<typeof saveAdminUiSettingsSchema>;
export type UpdateAdminUiSettingsInput = z.infer<typeof updateAdminUiSettingsSchema>;
