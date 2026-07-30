export type UserRole = "superadmin" | "admin" | "employee" | "user";

export const USER_ROLES: UserRole[] = ["superadmin", "admin", "employee", "user"];

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === "string" && USER_ROLES.includes(value as UserRole);

export const normalizeRole = (value: unknown): UserRole | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return isUserRole(normalized) ? normalized : null;
};
