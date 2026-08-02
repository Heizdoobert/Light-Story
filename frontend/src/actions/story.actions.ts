import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi } from '@/actions/http';

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

// ponytail: mirrors messageFromResponse in stories.actions.ts (which mirrors apiClient's inline error chain)
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