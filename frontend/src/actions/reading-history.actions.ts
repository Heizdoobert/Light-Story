import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi } from '@/actions/http';

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