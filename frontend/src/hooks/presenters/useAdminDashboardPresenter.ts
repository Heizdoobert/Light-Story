import { useState, useCallback, startTransition } from "react";
import { useAuth } from "@/context/AuthContext";
import type { AnalyticsRole } from "@/types/analytics";

export type AdminTabId =
  | "dashboard"
  | "dashboard_access_logs"
  | "audit_logs"
  | "create_story"
  | "stories"
  | "create_chapter"
  | "create_comic"
  | "categories"
  | "authors"
  | "ads"
  | "settings"
  | "profile"
  | "users"
  | "operations";

const tabPreloaders: Partial<Record<AdminTabId, () => Promise<unknown>>> = {
  create_story: () => import("@/components/admin/forms/StoryForm"),
  stories: () => import("@/components/admin/content/StoryManagementTab"),
  create_chapter: () => import("@/components/admin/forms/ChapterForm"),
  create_comic: () => import("@/components/admin/comics/ComicManagementTab"),
  ads: () => import("@/components/admin/system/AdManager"),
  profile: () => import("@/components/admin/users/UserProfileTab"),
  categories: () => import("@/components/admin/content/CategoryManagementTab"),
  authors: () => import("@/components/admin/content/AuthorManagementTab"),
  settings: () => import("@/components/admin/system/SystemSettingsTab"),
  users: () => import("@/components/admin/users/AdminUserManagement"),
  audit_logs: () => import("@/components/admin/system/AdminAuditLogsTab"),
  dashboard_access_logs: () => import("@/components/admin/system/DashboardAccessLogsTab"),
  operations: () => import("@/components/admin/system/OperationsCenterTab"),
};

export function useAdminDashboardPresenter() {
  const [activeTab, setActiveTab] = useState<AdminTabId>("dashboard");
  const { role, user } = useAuth();

  const handleTabChange = useCallback((tab: string) => {
    startTransition(() => {
      setActiveTab(tab as AdminTabId);
    });
  }, []);

  const handleTabPrefetch = useCallback((tab: string) => {
    tabPreloaders[tab as AdminTabId]?.();
  }, []);

  const analyticsRole: AnalyticsRole | null =
    role === "superadmin" || role === "admin" || role === "employee"
      ? (role as AnalyticsRole)
      : null;

  return {
    activeTab,
    role,
    userId: user?.id ?? null,
    analyticsRole,
    handleTabChange,
    handleTabPrefetch,
  };
}
