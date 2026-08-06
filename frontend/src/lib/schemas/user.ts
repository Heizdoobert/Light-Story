import { z } from "zod";

export const updateUserProfileSchema = z.object({
  full_name: z.string().optional(),
  avatar_url: z.string().nullable().optional(),
});

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["superadmin", "admin", "employee", "user", "translator", "author"]),
});

export type UpdateUserProfileInput = z.input<typeof updateUserProfileSchema>;
export type UpdateUserRoleInput = z.input<typeof updateUserRoleSchema>;