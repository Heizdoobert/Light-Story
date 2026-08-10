'use server';

import { revalidateTag } from 'next/cache';
import { act } from '@/actions/result';
import type { ActionResult } from '@/actions/result';
import { fetchApi, messageFromResponse } from '@/actions/http';
import { ROUTES } from '@/lib/constants/routes';
import { ACTION_ADMIN_ROLES, requireActionRole } from '@/lib/security/permission';
import { createChapterFormSchema } from '@/lib/schemas/chapter-form';
import type { CreateChapterFormInput } from '@/lib/schemas/chapter-form';

export async function createChapter(input: CreateChapterFormInput): Promise<ActionResult> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
  } catch {
    return { success: false, error: 'Bạn không có quyền thực hiện thao tác này' };
  }
  return act(createChapterFormSchema, input, async (chapter) => {
    const res = await fetchApi(ROUTES.API.ADMIN.MANAGE_CHAPTER, {
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
