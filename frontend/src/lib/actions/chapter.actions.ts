"use server";

import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants/cache-tags";
import {
  ACTION_ADMIN_ROLES,
  requireActionRole,
} from "@/lib/security/permission";
import {
  createChapterSchema,
  updateChapterSchema,
} from "@/lib/schemas/chapter";
import type {
  CreateChapterInput,
  UpdateChapterInput,
} from "@/lib/schemas/chapter";

export async function createChapter(data: CreateChapterInput) {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const parsed = createChapterSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }

    revalidateTag(CACHE_TAGS.CHAPTERS(parsed.data.comic_id));
    return { ok: true, data: { id: `chapter_${Date.now()}`, ...parsed.data } };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function updateChapter(
  id: string,
  comicId: string,
  data: UpdateChapterInput,
) {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const parsed = updateChapterSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }

    revalidateTag(CACHE_TAGS.CHAPTERS(comicId));
    return { ok: true, data: { id, ...parsed.data } };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function deleteChapter(id: string, comicId: string) {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);

    revalidateTag(CACHE_TAGS.CHAPTERS(comicId));
    return { ok: true, data: { id } };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}
