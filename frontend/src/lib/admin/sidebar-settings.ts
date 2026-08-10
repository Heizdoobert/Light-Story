// Per-role sidebar + category menu control persisted in site_settings.
import { type UserRole } from "@/lib/admin/admin-navigation";

export const SIDEBAR_CONTROL_KEY = "sidebar_control";

export type ConfigurableRole = "admin" | "employee" | "internal";

export type SidebarControl = {
  sidebarEnabled: Record<ConfigurableRole, boolean>;
  categoriesVisible: Record<ConfigurableRole, boolean>;
};

export const DEFAULT_SIDEBAR_CONTROL: SidebarControl = {
  sidebarEnabled: { admin: true, employee: true, internal: true },
  categoriesVisible: { admin: true, employee: true, internal: true },
};

export const CONFIGURABLE_ROLES: ConfigurableRole[] = ["admin", "employee", "internal"];

export const parseSidebarControl = (raw: unknown): SidebarControl => {
  let parsed: unknown = raw;
  for (let depth = 0; depth < 2 && typeof parsed === "string"; depth += 1) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      break;
    }
  }
  if (!parsed || typeof parsed !== "object") return DEFAULT_SIDEBAR_CONTROL;

  const source = parsed as Record<string, unknown>;
  const readRoleMap = (
    key: string,
    fallback: Record<ConfigurableRole, boolean>,
  ): Record<ConfigurableRole, boolean> => {
    const incoming = source[key];
    if (!incoming || typeof incoming !== "object") return fallback;
    const row = incoming as Record<string, unknown>;
    return CONFIGURABLE_ROLES.reduce(
      (acc, role) => {
        acc[role] = typeof row[role] === "boolean" ? row[role] : fallback[role];
        return acc;
      },
      { ...fallback },
    );
  };

  return {
    sidebarEnabled: readRoleMap("sidebarEnabled", DEFAULT_SIDEBAR_CONTROL.sidebarEnabled),
    categoriesVisible: readRoleMap("categoriesVisible", DEFAULT_SIDEBAR_CONTROL.categoriesVisible),
  };
};

export const isSidebarEnabledForRole = (control: SidebarControl, role: UserRole | null): boolean => {
  if (role === "superadmin") return true;
  if (!role || role === "user") return false;
  return control.sidebarEnabled[role as ConfigurableRole] ?? true;
};

export const isCategoryMenuVisibleForRole = (control: SidebarControl, role: UserRole | null): boolean => {
  if (role === "superadmin") return true;
  if (!role || role === "user") return false;
  return control.categoriesVisible[role as ConfigurableRole] ?? true;
};
