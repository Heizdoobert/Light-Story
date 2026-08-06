"use server";

import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants/cache-tags";
import {
  ACTION_ADMIN_ROLES,
  requireActionRole,
} from "@/lib/security/permission";
import { createComicSchema, updateComicSchema } from "@/lib/schemas/comic";
import type { CreateComicInput, UpdateComicInput } from "@/lib/schemas/comic";

export async function createComic(data: CreateComicInput) {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const parsed = createComicSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, success: false, error: parsed.error.issues[0].message };
    }

    revalidateTag(CACHE_TAGS.COMICS, "max");
    return { ok: true, success: true, data: { id: `comic_${Date.now()}`, ...parsed.data } };
  } catch (error) {
    return { ok: false, success: false, error: (error as Error).message };
  }
}

export async function updateComic(id: string, data: UpdateComicInput) {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);
    const parsed = updateComicSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, success: false, error: parsed.error.issues[0].message };
    }

    revalidateTag(CACHE_TAGS.COMICS, "max");
    revalidateTag(CACHE_TAGS.COMIC_DETAIL(id), "max");
    return { ok: true, success: true, data: { id, ...parsed.data } };
  } catch (error) {
    return { ok: false, success: false, error: (error as Error).message };
  }
}

export async function deleteComic(id: string) {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);

    revalidateTag(CACHE_TAGS.COMICS, "max");
    revalidateTag(CACHE_TAGS.COMIC_DETAIL(id), "max");
    return { ok: true, success: true, data: { id } };
  } catch (error) {
    return { ok: false, success: false, error: (error as Error).message };
  }
}
