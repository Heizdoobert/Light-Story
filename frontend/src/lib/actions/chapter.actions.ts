"use server";

import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants/cache-tags";
import {
  ACTION_ADMIN_ROLES,
  requireActionRole,
} from "@/lib/actions/permission";
import type {
  CreateChapterInput,
  UpdateChapterInput,
} from "@/lib/schemas/chapter";

export async function createChapter(data: CreateChapterInput) {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);

    revalidateTag(CACHE_TAGS.CHAPTERS(data.comic_id), "max");
    return { success: true, data: { id: `chapter_${Date.now()}`, ...data } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function updateChapter(
  id: string,
  comicId: string,
  data: UpdateChapterInput,
) {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);

    revalidateTag(CACHE_TAGS.CHAPTERS(comicId), "max");
    return { success: true, data: { id, ...data } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteChapter(_id: string, comicId: string) {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);

    revalidateTag(CACHE_TAGS.CHAPTERS(comicId), "max");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
