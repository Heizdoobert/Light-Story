"use server";

import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants/cache-tags";
import {
  ACTION_ADMIN_ROLES,
  requireActionRole,
} from "@/lib/actions/permission";
import type { CreateComicInput, UpdateComicInput } from "@/lib/schemas/comic";

export async function createComic(data: CreateComicInput) {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);

    revalidateTag(CACHE_TAGS.COMICS, "max");
    return { success: true, data: { id: `comic_${Date.now()}`, ...data } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function updateComic(id: string, data: UpdateComicInput) {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);

    revalidateTag(CACHE_TAGS.COMICS, "max");
    revalidateTag(CACHE_TAGS.COMIC_DETAIL(id), "max");
    return { success: true, data: { id, ...data } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteComic(id: string) {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);

    revalidateTag(CACHE_TAGS.COMICS, "max");
    revalidateTag(CACHE_TAGS.COMIC_DETAIL(id), "max");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
