import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';

const incrementStoryViewSchema = z.object({ storyId: z.string().uuid() });

export async function incrementStoryView(storyId: string): Promise<ActionResult> {
  return act(incrementStoryViewSchema, { storyId }, async ({ storyId: id }) => {
    const res = await fetchApi('/api/stories/views', {
      method: 'POST',
      body: JSON.stringify({ storyId: id }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('stories', 'max');
    return { ok: true };
  });
}
