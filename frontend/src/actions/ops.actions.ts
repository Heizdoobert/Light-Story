'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';

const setMaintenanceModeSchema = z.object({
  enabled: z.boolean(),
});

const clearCacheSchema = z.object({
  target: z.string().optional(),
});

const triggerBackupSchema = z.object({
  type: z.string().optional(),
});

export async function setMaintenanceMode(
  input: z.infer<typeof setMaintenanceModeSchema>,
): Promise<ActionResult> {
  return act(setMaintenanceModeSchema, input, async ({ enabled }) => {
    const res = await fetchApi('/api/admin/site-settings', {
      method: 'POST',
      body: JSON.stringify({ key: 'maintenance_mode', value: enabled }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('site_settings', 'max');
    return { ok: true };
  });
}

export async function maintenanceMode(
  input: z.infer<typeof setMaintenanceModeSchema>,
): Promise<ActionResult> {
  return setMaintenanceMode(input);
}

export async function clearCache(
  input: z.infer<typeof clearCacheSchema> = {},
): Promise<ActionResult> {
  return act(clearCacheSchema, input ?? {}, async (parsed) => {
    const target = parsed?.target ?? 'all';
    const res = await fetchApi('/api/admin/operations', {
      method: 'POST',
      body: JSON.stringify({ action: 'clearCache', target }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('site_settings', 'max');
    return { ok: true };
  });
}

export async function triggerBackup(
  input: z.infer<typeof triggerBackupSchema> = {},
): Promise<ActionResult> {
  return act(triggerBackupSchema, input ?? {}, async (parsed) => {
    const type = parsed?.type ?? 'full';
    const res = await fetchApi('/api/admin/operations', {
      method: 'POST',
      body: JSON.stringify({ action: 'triggerBackup', type }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('site_settings', 'max');
    return { ok: true };
  });
}
