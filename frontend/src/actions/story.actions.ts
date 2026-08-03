'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';

export { incrementStoryView } from './stories.actions';

const toggleStoryLikeSchema = z.object({
  storyId: z.string().min(1),
});

export type ToggleStoryLikeInput = string | { storyId: string };

export async function toggleStoryLike(input: ToggleStoryLikeInput): Promise<ActionResult> {
  const payload = typeof input === 'string' ? { storyId: input } : input;
  return act(toggleStoryLikeSchema, payload, async ({ storyId: id }) => {
    const res = await fetchApi('/api/rpc/toggle_story_like', {
      method: 'POST',
      body: JSON.stringify({ story_id_param: id }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('story', 'max');
    return { ok: true };
  });
}
