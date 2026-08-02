import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi } from '@/actions/http';

const updateSiteSettingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export async function updateSiteSetting(input: {
  key: string;
  value: unknown;
}): Promise<ActionResult> {
  return act(updateSiteSettingSchema, input, async ({ key, value }) => {
    const res = await fetchApi('/api/admin/site-settings', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('site_settings', 'max');
    revalidateTag('ad_slots', 'max');
    return { ok: true };
  });
}

// ponytail: mirrors apiClient's inline error extraction for non-ok bodies; statusText fallback keeps it dependency-free
async function messageFromResponse(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return (
      (typeof body?.error === 'string' ? body.error : undefined) ??
      body?.error?.message ??
      body?.message ??
      (res.statusText || `HTTP Error ${res.status}`)
    );
  } catch {
    return res.statusText || `HTTP Error ${res.status}`;
  }
}
