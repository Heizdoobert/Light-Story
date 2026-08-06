import { z } from "zod";

export const setMaintenanceModeSchema = z.object({
  enabled: z.boolean(),
});

export const clearCacheSchema = z.object({
  target: z.string().optional(),
});

export const triggerBackupSchema = z.object({
  type: z.string().optional(),
});

export type SetMaintenanceModeInput = z.infer<typeof setMaintenanceModeSchema>;
export type ClearCacheInput = z.infer<typeof clearCacheSchema>;
export type TriggerBackupInput = z.infer<typeof triggerBackupSchema>;
