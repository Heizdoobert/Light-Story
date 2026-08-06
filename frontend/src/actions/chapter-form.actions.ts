'use server';

import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';
import { createChapterSchema } from '@/lib/schemas/chapter-form';
import type { CreateChapterInput } from '@/lib/schemas/chapter-form';

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
