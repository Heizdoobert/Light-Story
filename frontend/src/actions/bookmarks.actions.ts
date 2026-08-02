import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi } from '@/actions/http';

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

// ponytail: mirrors apiClient's inline error extraction for non-ok bodies; statusText fallback keeps it dependency-free
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