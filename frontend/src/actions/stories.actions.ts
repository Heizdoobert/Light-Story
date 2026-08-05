'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';

const incrementStoryViewSchema = z.object({ storyId: z.string().min(1) });

export type IncrementStoryViewInput = string | { storyId: string };

export async function incrementStoryView(input: IncrementStoryViewInput): Promise<ActionResult> {
  const payload = typeof input === 'string' ? { storyId: input } : input;
  return act(incrementStoryViewSchema, payload, async ({ storyId }) => {
    const res = await fetchApi('/api/stories/views', {
      method: 'POST',
      body: JSON.stringify({ storyId }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('stories', 'max');
    return { ok: true };
  });
}

