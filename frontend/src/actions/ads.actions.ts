'use server';

import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';
import { AD_CONTROL_KEYS } from '@/lib/admin/ad-policy';
import {
  updateAdConfigSchema,
  updateAdSlotSchema,
  toggleAdSlotSchema,
} from '@/lib/schemas/ads';

export async function updateAdConfig(input: {
  key: string;
  value: unknown;
}): Promise<ActionResult> {
  return act(updateAdConfigSchema, input, async ({ key, value }) => {
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

export async function updateSiteSetting(input: {
  key: string;
  value: unknown;
}): Promise<ActionResult> {
  return updateAdConfig(input);
}

export async function updateAdSlot(input: {
  slot: string;
  code: string;
}): Promise<ActionResult> {
  return act(updateAdSlotSchema, input, async ({ slot, code }) => {
    const res = await fetchApi('/api/admin/site-settings', {
      method: 'POST',
      body: JSON.stringify({ key: slot, value: code }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('site_settings', 'max');
    revalidateTag('ad_slots', 'max');
    return { ok: true };
  });
}

export async function toggleAdSlot(input: {
  slot?: string;
  enabled: boolean;
}): Promise<ActionResult> {
  return act(toggleAdSlotSchema, input, async ({ slot, enabled }) => {
    const key = slot || AD_CONTROL_KEYS.enabled;
    const res = await fetchApi('/api/admin/site-settings', {
      method: 'POST',
      body: JSON.stringify({ key, value: enabled }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('site_settings', 'max');
    revalidateTag('ad_slots', 'max');
    return { ok: true };
  });
}
