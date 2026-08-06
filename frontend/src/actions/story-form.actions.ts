'use server';

import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';
import { createStorySchema } from '@/lib/schemas/story-form';

export async function createStory(input: unknown): Promise<ActionResult> {
  return act(createStorySchema, input, async (story) => {
    const res = await fetchApi('/api/admin/manage-story', {
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
