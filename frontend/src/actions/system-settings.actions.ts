'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';
import { SITE_SETTING_KEYS } from '@/lib/admin/systemSettings';

export const saveSystemSettingsSchema = z.object({
  compactMode: z.boolean(),
  showSyncBadge: z.boolean(),
  dashboardTabVisibility: z.record(z.string(), z.array(z.string())),
  sidebarMenuVisibility: z.record(z.string(), z.array(z.string())),
});

export const updateSystemSettingsSchema = saveSystemSettingsSchema;

export async function saveSystemSettings(
  input: z.infer<typeof saveSystemSettingsSchema>,
): Promise<ActionResult> {
  return act(saveSystemSettingsSchema, input, async (snapshot) => {
    const payload = [
      { key: SITE_SETTING_KEYS.uiCompactMode, value: snapshot.compactMode },
      { key: SITE_SETTING_KEYS.uiShowSyncBadge, value: snapshot.showSyncBadge },
      { key: SITE_SETTING_KEYS.dashboardTabVisibility, value: snapshot.dashboardTabVisibility },
      { key: SITE_SETTING_KEYS.sidebarMenuVisibility, value: snapshot.sidebarMenuVisibility },
    ];

    const res = await fetchApi('/api/admin/site-settings', {
      method: 'POST',
      body: JSON.stringify({ payload }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('site_settings', 'max');
    return { ok: true };
  });
}

export async function updateSystemSettings(
  input: z.infer<typeof updateSystemSettingsSchema>,
): Promise<ActionResult> {
  return saveSystemSettings(input);
}
