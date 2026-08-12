import {
  BarChart3,
  BookOpen,
  Bug,
  DollarSign,
  Layers,
  LayoutDashboard,
  PenSquare,
  Settings,
  ShieldAlert,
  Tags,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

export type UserRole = "superadmin" | "admin" | "employee" | "internal" | "user";

export type AdminMenuId =
  | "dashboard"
  | "analytics"
  | "comics"
  | "chapters"
  | "categories"
  | "authors"
  | "genres"
  | "tags"
  | "users"
  | "ads"
  | "settings"
  | "profile"
  | "audit_logs"
  | "operations"
  | "create_story"
  | "stories"
  | "create_chapter"
  | "create_comic"
  | "sentry";

export type AdminMenuItem = {
  id: AdminMenuId;
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
};

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  {
    id: "dashboard",
    label: "Tổng quan",
    href: ROUTES.ADMIN.DASHBOARD,
    icon: LayoutDashboard,
    roles: ["superadmin", "admin"],
  },
  {
    id: "analytics",
    label: "Thống kê & R2",
    href: ROUTES.ADMIN.ANALYTICS,
    icon: BarChart3,
    roles: ["superadmin", "admin"],
  },
  {
    id: "comics",
    label: "Quản lý Truyện",
    href: ROUTES.ADMIN.COMICS,
    icon: BookOpen,
    roles: ["superadmin", "admin", "employee"],
  },
  {
    id: "chapters",
    label: "Quản lý Chương",
    href: ROUTES.ADMIN.CHAPTERS,
    icon: Layers,
    roles: ["superadmin", "admin", "employee"],
  },
  {
    id: "categories",
    label: "Thể loại",
    href: ROUTES.ADMIN.CATEGORIES,
    icon: Tags,
    roles: ["superadmin", "admin", "employee"],
  },
  {
    id: "authors",
    label: "Tác giả & Nhóm dịch",
    href: ROUTES.ADMIN.AUTHORS,
    icon: PenSquare,
    roles: ["superadmin", "admin", "employee"],
  },
  {
    id: "genres",
    label: "Genres",
    href: ROUTES.ADMIN.GENRES,
    icon: Layers,
    roles: ["superadmin", "admin", "employee"],
  },
  {
    id: "tags",
    label: "Thẻ Tag",
    href: ROUTES.ADMIN.TAGS,
    icon: Tags,
    roles: ["superadmin", "admin", "employee"],
  },
  {
    id: "users",
    label: "Người dùng",
    href: ROUTES.ADMIN.USERS,
    icon: Users,
    roles: ["superadmin"],
  },
  {
    id: "ads",
    label: "Quảng cáo",
    href: ROUTES.ADMIN.ADS,
    icon: DollarSign,
    roles: ["superadmin", "admin"],
  },
  {
    id: "settings",
    label: "Cài đặt",
    href: ROUTES.ADMIN.SETTINGS,
    icon: Settings,
    roles: ["superadmin", "admin"],
  },
  {
    id: "profile",
    label: "Hồ sơ cá nhân",
    href: ROUTES.ADMIN.PROFILE,
    icon: UserCircle,
    roles: ["superadmin", "admin", "employee"],
  },
  {
    id: "audit_logs",
    label: "Audit Log",
    href: ROUTES.ADMIN.AUDIT,
    icon: ShieldAlert,
    roles: ["superadmin"],
  },
  {
    id: "sentry",
    label: "Sentry",
    href: ROUTES.ADMIN.SENTRY,
    icon: Bug,
    roles: ["superadmin"],
  },
];

export function getAdminMenuItems(
  t?: (key: string) => string,
): AdminMenuItem[] {
  if (!t) return ADMIN_MENU_ITEMS;
  return ADMIN_MENU_ITEMS.map((item) => ({
    ...item,
    label: t(`nav_${item.id}`) || item.label,
  }));
}

export const ADMIN_MENU_IDS = ADMIN_MENU_ITEMS.map(
  (item) => item.id,
) as AdminMenuId[];

export const ADMIN_MENU_LABELS: Record<AdminMenuId, string> =
  ADMIN_MENU_ITEMS.reduce(
    (acc, item) => {
      acc[item.id] = item.label;
      return acc;
    },
    {} as Record<AdminMenuId, string>,
  );

export const DEFAULT_ADMIN_MENU_VISIBILITY: Record<UserRole, AdminMenuId[]> = {
  superadmin: [...ADMIN_MENU_IDS],
  admin: [
    "dashboard",
    "analytics",
    "comics",
    "chapters",
    "categories",
    "authors",
    "genres",
    "tags",
    "ads",
    "settings",
    "profile",
  ],
  employee: ["comics", "chapters", "categories", "authors", "genres", "tags", "profile"],
  internal: [],
  user: [],
};

export const isMenuVisibleForRole = (
  role: UserRole | null | undefined,
  menuId: AdminMenuId,
): boolean => {
  if (!role) return false;
  const item = ADMIN_MENU_ITEMS.find((i) => i.id === menuId);
  return !!item && item.roles.includes(role);
};
