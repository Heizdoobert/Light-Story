"use server";

import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants/cache-tags";
import {
  ACTION_ADMIN_ROLES,
  requireActionRole,
} from "@/lib/security/permission";
import { z } from "zod";

const updateUserProfileSchema = z.object({
  full_name: z.string().optional(),
  avatar_url: z.string().nullable().optional(),
});

const updateUserRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["superadmin", "admin", "employee", "user", "translator", "author"]),
});

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function updateUserProfile(
  userId: string,
  data: { full_name?: string; avatar_url?: string | null },
): Promise<ActionResult> {
  try {
    const { userId: currentUserId } = await requireActionRole([
      "user",
      "admin",
      "superadmin",
      "employee",
    ]);
    if (currentUserId !== "internal" && currentUserId !== userId) {
      return { ok: false, error: "Bạn chỉ có thể cập nhật hồ sơ của chính mình" };
    }

    const parsed = updateUserProfileSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }

    revalidateTag(CACHE_TAGS.USERS);
    return { ok: true, data: { userId, ...parsed.data } };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<ActionResult> {
  try {
    await requireActionRole(ACTION_ADMIN_ROLES);

    const parsed = updateUserRoleSchema.safeParse({ userId, role });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }

    revalidateTag(CACHE_TAGS.USERS);
    return { ok: true, data: { userId, role: parsed.data.role } };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}
