"use client";
import React, {
  Suspense,
  lazy,
  startTransition,
  useState,
  useCallback,
} from "react";
import { useAuth } from "@/modules/auth/AuthContext";
import { AdminLayout } from '../layout/AdminLayout';

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

type AdminTabId =
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
  create_story: () => import("../forms/StoryForm"),
  stories: () => import("../content/StoryManagementTab"),
  create_chapter: () => import("../forms/ChapterForm"),
  create_comic: () => import("../comics/ComicManagementTab"),
  ads: () => import("../system/AdManager"),
  profile: () => import("../users/UserProfileTab"),
  categories: () => import("../content/CategoryManagementTab"),
  authors: () => import("../content/AuthorManagementTab"),
  settings: () => import("../system/SystemSettingsTab"),
  users: () => import("../users/AdminUserManagement"),
  audit_logs: () => import("../system/AdminAuditLogsTab"),
  dashboard_access_logs: () => import("../system/DashboardAccessLogsTab"),
  operations: () => import("../system/OperationsCenterTab"),
};

const TabLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);


export const AdminDashboard: React.FC = () => {
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

  return (
    <AdminDashboardContent
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onTabPrefetch={handleTabPrefetch}
      role={role}
      userId={user?.id ?? null}
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
}> = ({ activeTab, onTabChange, onTabPrefetch, role, userId }) => {
  const withSuspense = useCallback((node: React.ReactNode) => <Suspense fallback={<TabLoadingFallback />}>{node}</Suspense>, []);

  const analyticsRole = role === 'superadmin' || role === 'admin' || role === 'employee' ? role : null;

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
  }, [activeTab, analyticsRole, onTabChange, userId, withSuspense]);

  return (
    <AdminLayout activeTab={activeTab} onTabChange={onTabChange} onTabPrefetch={onTabPrefetch}>
      {renderActiveTab()}
    </AdminLayout>
  );
};
