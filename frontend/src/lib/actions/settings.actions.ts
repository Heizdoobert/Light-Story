'use server';

import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { SETTINGS_ADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { getServerSupabase } from '@/lib/supabase/server';
import { saveSiteSettingsSchema } from '@/lib/schemas/admin';
import type { SaveSiteSettingsInput } from '@/lib/schemas/admin';
import { AD_SLOT_KEYS, parseSiteSettingsRows, validateAdMarkup } from '@/lib/admin/ad-policy';

type ActionResult<T = unknown> =
  | { ok: true; success: true; data?: T; error?: undefined }
  | { ok: false; success: false; error: string; data?: undefined };

export async function saveSiteSettings(input: SaveSiteSettingsInput): Promise<ActionResult<{ count: number }>> {
  try {
    await requireActionRole(SETTINGS_ADMIN_ROLES);
    const parsed = saveSiteSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, success: false, error: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }
    const db = await getServerSupabase();
    if (!db) return { ok: false, success: false, error: 'Không thể kết nối cơ sở dữ liệu' };
    const { runtime, slotMarkup } = parseSiteSettingsRows(parsed.data.entries);
    for (const key of AD_SLOT_KEYS) {
      const validation = validateAdMarkup(slotMarkup[key], runtime);
      if (!validation.ok) {
        return { ok: false, success: false, error: `Ad markup policy violation (${key}): ${validation.reason}` };
      }
    }
    const rows = parsed.data.entries.map((e) => ({
      key: e.key,
      value: e.value,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await db.from('site_settings').upsert(rows);
    if (error) return { ok: false, success: false, error: error.message };
    revalidateTag(CACHE_TAGS.SETTINGS, 'max');
    return { ok: true, success: true, data: { count: rows.length } };
  } catch (err) {
    return { ok: false, success: false, error: (err as Error).message };
  }
}
