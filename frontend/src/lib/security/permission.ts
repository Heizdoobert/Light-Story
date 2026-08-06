import { createClient as createSessionClient } from "@/lib/api/server";

export const ACTION_ADMIN_ROLES = [
  "superadmin",
  "admin",
  "employee",
  "internal",
] as const;

export class ActionUnauthorizedError extends Error {
  constructor(message = "unauthorized") {
    super(message);
    this.name = "ActionUnauthorizedError";
  }
}

export class ActionForbiddenError extends Error {
  constructor(message = "forbidden: insufficient permissions") {
    super(message);
    this.name = "ActionForbiddenError";
  }
}

export type ActionRequester = { userId: string; role: string };

/**
 * Resolves the current session user and checks they hold one of the allowed
 * roles. Role is sourced from auth.users.app_metadata (synced by the DB
 * trigger), avoiding any profiles-table lookup per action.
 */
export async function requireActionRole(
  allowedRoles: readonly string[],
): Promise<ActionRequester> {
  const sessionClient = await createSessionClient();
  const { data: userData, error } = await sessionClient.auth.getUser();
  const userId = userData?.user?.id;
  const role =
    typeof userData?.user?.app_metadata?.role === "string"
      ? userData.user.app_metadata.role
      : undefined;

  if (error || !userId || !role) {
    throw new ActionUnauthorizedError();
  }

  if (role !== "superadmin" && !allowedRoles.includes(role)) {
    throw new ActionForbiddenError();
  }

  return { userId, role };
}
