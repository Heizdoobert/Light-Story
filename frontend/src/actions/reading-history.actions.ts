'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';

const saveReadingProgressSchema = z.object({
  comicId: z.string().min(1),
  chapterId: z.string().min(1),
  chapterNumber: z.number().int(),
});

export async function saveReadingProgress(input: {
  comicId: string;
  chapterId: string;
  chapterNumber: number;
}): Promise<ActionResult> {
  return act(saveReadingProgressSchema, input, async ({ comicId, chapterId, chapterNumber }) => {
    const res = await fetchApi('/api/user/history', {
      method: 'POST',
      body: JSON.stringify({ comicId, chapterId, chapterNumber }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('reading-history', 'max');
    return { ok: true };
  });
}

const clearReadingHistorySchema = z.object({}).optional();

export async function clearReadingHistory(): Promise<ActionResult> {
  return act(clearReadingHistorySchema, {}, async () => {
    const res = await fetchApi('/api/user/history', {
      method: 'DELETE',
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('reading-history', 'max');
    return { ok: true };
  });
}
