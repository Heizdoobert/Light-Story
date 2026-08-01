"use client";
import React, { Suspense, lazy, useCallback } from "react";
import { AdminLayout } from "../layout/AdminLayout";
import { useAdminDashboardPresenter } from "@/hooks/presenters/useAdminDashboardPresenter";
import type { AnalyticsRole } from "@/types/analytics";

const AdManager = lazy(() => import("../system/AdManager").then((m) => ({ default: m.AdManager })));
const UserProfileTab = lazy(() =>
  import("../users/UserProfileTab").then((m) => ({ default: m.UserProfileTab })),
);
const CategoryManagementTab = lazy(() =>
  import("../content/CategoryManagementTab").then((m) => ({ default: m.CategoryManagementTab })),
);
const AuthorManagementTab = lazy(() =>
  import("../content/AuthorManagementTab").then((m) => ({ default: m.AuthorManagementTab })),
);
const SystemSettingsTab = lazy(() =>
  import("../system/SystemSettingsTab").then((m) => ({ default: m.SystemSettingsTab })),
);
const AdminUserManagement = lazy(() =>
  import("../users/AdminUserManagement").then((m) => ({ default: m.AdminUserManagement })),
);
const OperationsCenterTab = lazy(() =>
  import("../system/OperationsCenterTab").then((m) => ({ default: m.OperationsCenterTab })),
);
const AdminAuditLogsTab = lazy(() =>
  import("../system/AdminAuditLogsTab").then((m) => ({ default: m.AdminAuditLogsTab })),
);
const DashboardAccessLogsTab = lazy(() =>
  import("../system/DashboardAccessLogsTab").then((m) => ({ default: m.DashboardAccessLogsTab })),
);
const ComicManagementTab = lazy(() =>
  import("../comics/ComicManagementTab").then((m) => ({ default: m.ComicManagementTab })),
);
const AnalyticsDashboardTab = lazy(() =>
  import("./AnalyticsDashboardTab").then((m) => ({ default: m.AnalyticsDashboardTab })),
);

const TabLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const {
    activeTab,
    role,
    userId,
    analyticsRole,
    handleTabChange,
    handleTabPrefetch,
  } = useAdminDashboardPresenter();

  return (
    <AdminDashboardContent
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onTabPrefetch={handleTabPrefetch}
      role={role}
      userId={userId}
      analyticsRole={analyticsRole}
    />
  );
};

export default AdminDashboard;

const AdminDashboardContent: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
  onTabPrefetch?: (tab: string) => void;
  role: string | null;
  userId: string | null;
  analyticsRole: AnalyticsRole | null;
}> = ({ activeTab, onTabChange, onTabPrefetch, role, userId, analyticsRole }) => {
  const withSuspense = useCallback(
    (node: React.ReactNode) => <Suspense fallback={<TabLoadingFallback />}>{node}</Suspense>,
    [],
  );

  const renderActiveTab = useCallback(() => {
    switch (activeTab) {
      case "dashboard":
        return withSuspense(<AnalyticsDashboardTab role={analyticsRole} userId={userId} />);
      case "operations":
        return withSuspense(<OperationsCenterTab onNavigate={onTabChange} />);
      case "create_story":
      case "create_chapter":
      case "stories":
      case "create_comic":
        return withSuspense(<ComicManagementTab />);
      case "ads":
        return withSuspense(<AdManager />);
      case "profile":
        return withSuspense(<UserProfileTab />);
      case "categories":
        return withSuspense(<CategoryManagementTab />);
      case "authors":
        return withSuspense(<AuthorManagementTab />);
      case "settings":
        return withSuspense(<SystemSettingsTab />);
      case "users":
        return role === "superadmin" || role === "admin" ? withSuspense(<AdminUserManagement />) : null;
      case "audit_logs":
        return role === "superadmin" ? withSuspense(<AdminAuditLogsTab />) : null;
      case "dashboard_access_logs":
        return role === "superadmin" || role === "admin" ? withSuspense(<DashboardAccessLogsTab />) : null;
      default:
        return null;
    }
  }, [activeTab, analyticsRole, onTabChange, userId, withSuspense, role]);

  return (
    <AdminLayout activeTab={activeTab} onTabChange={onTabChange} onTabPrefetch={onTabPrefetch}>
      {renderActiveTab()}
    </AdminLayout>
  );
};
