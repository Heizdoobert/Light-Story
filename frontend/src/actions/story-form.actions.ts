'use server';

import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';
import { ROUTES } from '@/lib/constants/routes';
import { ACTION_ADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { createStorySchema } from '@/lib/schemas/story-form';

export async function createStory(input: unknown): Promise<ActionResult> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
  } catch {
    return { success: false, error: 'Bạn không có quyền thực hiện thao tác này' };
  }
  return act(createStorySchema, input, async (story) => {
    const res = await fetchApi(ROUTES.API.ADMIN.MANAGE_STORY, {
      method: 'POST',
      body: JSON.stringify({ story }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('admin_stories', 'max');
    revalidateTag('admin-dashboard-metrics', 'max');
    return { ok: true };
  });
}
