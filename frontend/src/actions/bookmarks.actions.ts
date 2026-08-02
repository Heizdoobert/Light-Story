import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';

const bookmarkSchema = z.object({ comicId: z.string().min(1).max(128) });

export async function toggleBookmark(comicId: string): Promise<ActionResult> {
  return act(bookmarkSchema, { comicId }, async ({ comicId: id }) => {
    const res = await fetchApi('/api/user/bookmarks/toggle', {
      method: 'POST',
      body: JSON.stringify({ comicId: id }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('bookmarks', 'max');
    return { ok: true };
  });
}
