import { createClient as createSessionClient } from "@/lib/api/server";

export const ACTION_ADMIN_ROLES = [
  "superadmin",
  "admin",
  "employee",
] as const;

// Settings/ads write access — admin tier and up.
export const SETTINGS_ADMIN_ROLES = ["superadmin", "admin"] as const;

// User management + audit — superadmin only.
export const SUPERADMIN_ROLES = ["superadmin"] as const;

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

export class ActionRateLimitError extends Error {
  constructor(message = "too many requests, please try again later") {
    super(message);
    this.name = "ActionRateLimitError";
  }
}

export type ActionRequester = { userId: string; role: string };

export type ActionRateLimitConfig = {
  limit?: number;
  windowMs?: number;
};

// In-memory sliding-window store for Server Action anti-spam
const actionLimitStore = new Map<string, number[]>();
const MAX_ACTION_STORE_ENTRIES = 5_000;

export function checkActionRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps = actionLimitStore.get(key);
  if (!timestamps) {
    if (actionLimitStore.size >= MAX_ACTION_STORE_ENTRIES) {
      const firstKey = actionLimitStore.keys().next().value;
      if (firstKey) actionLimitStore.delete(firstKey);
    }
    timestamps = [];
    actionLimitStore.set(key, timestamps);
  }

  const validTimestamps = timestamps.filter((t) => t > windowStart);
  if (validTimestamps.length >= limit) {
    return false;
  }

  validTimestamps.push(now);
  actionLimitStore.set(key, validTimestamps);
  return true;
}

/**
 * Resolves the current session user and checks they hold one of the allowed
 * roles. Role is sourced from auth.users.app_metadata (synced by the DB
 * trigger), avoiding any profiles-table lookup per action.
 */
export async function requireActionRole(
  allowedRoles: readonly string[],
  rateLimitConfig?: ActionRateLimitConfig,
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

  if (rateLimitConfig) {
    const isAllowed = checkActionRateLimit(
      `action:${userId}`,
      rateLimitConfig.limit ?? 60,
      rateLimitConfig.windowMs ?? 60_000,
    );
    if (!isAllowed) {
      throw new ActionRateLimitError();
    }
  }

  return { userId, role };
}
