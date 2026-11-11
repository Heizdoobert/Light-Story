'use server';

import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { SETTINGS_ADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { fetchApi } from '@/actions/http';
import { saveSiteSettingsSchema } from '@/lib/schemas/admin';
import type { SaveSiteSettingsInput } from '@/lib/schemas/admin';
import type { ActionResult } from '@/actions/result';

export async function saveSiteSettings(input: SaveSiteSettingsInput): Promise<ActionResult<{ count: number }>> {
  try {
    await requireActionRole(SETTINGS_ADMIN_ROLES);
    const parsed = saveSiteSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const res = await fetchApi('/api/admin/site-settings', {
      method: 'POST',
      body: JSON.stringify({ entries: parsed.data.entries, payload: parsed.data.entries }),
    });
    const json = (await res.json()) as { error?: string; count?: number };
    if (!res.ok) return { success: false, error: json.error ?? res.statusText };
    revalidateTag(CACHE_TAGS.SETTINGS, 'max');
    return { success: true, data: { count: json.count ?? parsed.data.entries.length } };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
