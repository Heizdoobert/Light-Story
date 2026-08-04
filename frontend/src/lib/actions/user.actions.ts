"use server";

import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants/cache-tags";
import {
  ACTION_ADMIN_ROLES,
  requireActionRole,
} from "@/lib/actions/permission";

type ActionResult<T = unknown> =
  { success: true; data?: T } | { success: false; error: string };

export async function updateUserProfile(
  userId: string,
  data: { full_name?: string; avatar_url?: string | null },
): Promise<ActionResult> {
  try {
    const { userId: currentUserId } = await requireActionRole([
      "user",
      "admin",
      "superadmin",
      "haunt",
    ]);
    if (currentUserId !== "internal" && currentUserId !== userId) {
      throw new Error("Bạn chỉ có thể cập nhật hồ sơ của chính mình");
    }

    revalidateTag(CACHE_TAGS.USERS, "max");
    return { success: true, data: { userId, ...data } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<ActionResult> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);

    revalidateTag(CACHE_TAGS.USERS, "max");
    return { success: true, data: { userId, role } };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
