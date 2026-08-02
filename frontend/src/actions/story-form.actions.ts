'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';

export const createStorySchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  description: z.string(),
  author_id: z.string().min(1).nullable(),
  category: z.string().min(1),
  cover_url: z.string().min(1),
  status: z.enum(['draft', 'published', 'ongoing', 'completed', 'archived']),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;

export async function createStory(input: CreateStoryInput): Promise<ActionResult> {
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
