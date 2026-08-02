import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';

const toggleStoryLikeSchema = z.object({ storyId: z.string().uuid() });

export async function toggleStoryLike(storyId: string): Promise<ActionResult> {
  return act(toggleStoryLikeSchema, { storyId }, async ({ storyId: id }) => {
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
