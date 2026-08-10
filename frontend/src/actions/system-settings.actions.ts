'use server';

import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';
import { SETTINGS_ADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { SITE_SETTING_KEYS } from '@/lib/admin/system-settings';
import { saveAdminUiSettingsSchema } from '@/lib/schemas/system-settings-form';
import type { SaveAdminUiSettingsInput, UpdateAdminUiSettingsInput } from '@/lib/schemas/system-settings-form';

export async function saveSystemSettings(input: SaveAdminUiSettingsInput): Promise<ActionResult> {
  try {
    await requireActionRole(SETTINGS_ADMIN_ROLES);
  } catch {
    return { success: false, error: 'Bạn không có quyền thực hiện thao tác này' };
  }
  return act(saveAdminUiSettingsSchema, input, async (snapshot) => {
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

export async function updateSystemSettings(input: UpdateAdminUiSettingsInput): Promise<ActionResult> {
  return saveSystemSettings(input);
}
