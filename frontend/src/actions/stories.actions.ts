import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi } from '@/actions/http';

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