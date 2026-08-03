'use server';

import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';

const createChapterSchema = z.object({
  story_id: z.string().min(1),
  chapter_number: z.number().int().positive(),
  title: z.string().min(1),
  content: z.string(),
});

export type CreateChapterInput = z.infer<typeof createChapterSchema>;

export async function createChapter(input: CreateChapterInput): Promise<ActionResult> {
  return act(createChapterSchema, input, async (chapter) => {
    const res = await fetchApi('/api/admin/manage-chapter', {
      method: 'POST',
      body: JSON.stringify({ chapter }),
    });
    if (!res.ok) {
      return { ok: false, error: await messageFromResponse(res) };
    }
    revalidateTag('chapters', 'max');
    return { ok: true };
  });
}
