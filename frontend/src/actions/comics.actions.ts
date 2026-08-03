'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';

const createComicSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  coverUrl: z.string(),
  author: z.string().optional(),
  status: z.enum(['ongoing', 'completed']).optional(),
  category: z.array(z.string()).optional(),
});

const createComicChapterSchema = z.object({
  comicId: z.string().min(1),
  tenantKey: z.string().min(1),
  storyId: z.string().min(1),
  chapterNumber: z.number().int().min(1),
  title: z.string(),
  content: z.unknown(),
});

export async function createComic(input: z.infer<typeof createComicSchema>): Promise<ActionResult> {
  return act(createComicSchema, input, async ({ title, description, coverUrl, author, status, category }) => {
    const res = await fetchApi('/api/comics', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        cover_url: coverUrl,
        author: author ?? 'Unknown',
        status: status ?? 'ongoing',
        category: category ?? [],
      }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('comics', 'max');
    return { ok: true, data: await res.json() };
  });
}

export async function createComicChapter(input: z.infer<typeof createComicChapterSchema>): Promise<ActionResult> {
  return act(createComicChapterSchema, input, async ({ comicId, tenantKey, storyId, chapterNumber, title, content }) => {
    const res = await fetchApi(`/api/comics/${comicId}/chapters`, {
      method: 'POST',
      body: JSON.stringify({ storyId, tenantKey, chapterNumber, title, content }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('comics', 'max');
    return { ok: true, data: await res.json() };
  });
}
