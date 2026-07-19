"use client";
import React, {
  Suspense,
  lazy,
  startTransition,
  useState,
  useCallback,
} from "react";
import { useAuth } from "@/modules/auth/AuthContext";
import { AdminLayout } from './AdminLayout';

const StoryForm = lazy(() => import("@/app/admin/_components/StoryForm").then((m) => ({ default: m.StoryForm })));
const StoryManagementTab = lazy(() =>
  import("@/app/admin/_components/StoryManagementTab").then((m) => ({ default: m.StoryManagementTab })),
);
const ChapterForm = lazy(() => import("@/app/admin/_components/ChapterForm").then((m) => ({ default: m.ChapterForm })));
const AdManager = lazy(() => import("@/app/admin/_components/AdManager").then((m) => ({ default: m.AdManager })));
const UserProfileTab = lazy(() =>
  import("@/app/admin/_components/UserProfileTab").then((m) => ({ default: m.UserProfileTab })),
);
const CategoryManagementTab = lazy(() =>
  import("@/app/admin/_components/CategoryManagementTab").then((m) => ({ default: m.CategoryManagementTab })),
);
const AuthorManagementTab = lazy(() =>
  import("@/app/admin/_components/AuthorManagementTab").then((m) => ({ default: m.AuthorManagementTab })),
);
const SystemSettingsTab = lazy(() =>
  import("@/app/admin/_components/SystemSettingsTab").then((m) => ({ default: m.SystemSettingsTab })),
);
const AdminUserManagement = lazy(() =>
  import("@/app/admin/_components/AdminUserManagement").then((m) => ({ default: m.AdminUserManagement })),
);
const OperationsCenterTab = lazy(() =>
  import("@/app/admin/_components/OperationsCenterTab").then((m) => ({ default: m.OperationsCenterTab })),
);
const OperationsDataTab = lazy(() =>
  import("@/app/admin/_components/OperationsDataTab").then((m) => ({ default: m.OperationsDataTab })),
);
const AdminAuditLogsTab = lazy(() =>
  import("@/app/admin/_components/AdminAuditLogsTab").then((m) => ({ default: m.AdminAuditLogsTab })),
);
const DashboardAccessLogsTab = lazy(() =>
  import("@/app/admin/_components/DashboardAccessLogsTab").then((m) => ({ default: m.DashboardAccessLogsTab })),
);
const ComicManagementTab = lazy(() =>
  import("@/app/admin/_components/ComicManagementTab").then((m) => ({ default: m.ComicManagementTab })),
);
const AnalyticsDashboardTab = lazy(() =>
  import("@/app/admin/_components/AnalyticsDashboardTab").then((m) => ({ default: m.AnalyticsDashboardTab })),
);

type AdminTabId =
  | "dashboard"
  | "dashboard_access_logs"
  | "audit_logs"
  | "operations_data"
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
  create_story: () => import("@/app/admin/_components/StoryForm"),
  stories: () => import("@/app/admin/_components/StoryManagementTab"),
  create_chapter: () => import("@/app/admin/_components/ChapterForm"),
  create_comic: () => import("@/app/admin/_components/ComicManagementTab"),
  ads: () => import("@/app/admin/_components/AdManager"),
  profile: () => import("@/app/admin/_components/UserProfileTab"),
  categories: () => import("@/app/admin/_components/CategoryManagementTab"),
  authors: () => import("@/app/admin/_components/AuthorManagementTab"),
  settings: () => import("@/app/admin/_components/SystemSettingsTab"),
  users: () => import("@/app/admin/_components/AdminUserManagement"),
  audit_logs: () => import("@/app/admin/_components/AdminAuditLogsTab"),
  dashboard_access_logs: () => import("@/app/admin/_components/DashboardAccessLogsTab"),
  operations: () => import("@/app/admin/_components/OperationsCenterTab"),
  operations_data: () => import("@/app/admin/_components/OperationsDataTab"),
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
      case "operations_data":
        return withSuspense(<OperationsDataTab />);
      case "create_story":
        return withSuspense(<StoryForm />);
      case "create_chapter":
        return withSuspense(<ChapterForm />);
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
      case "create_comic":
        return withSuspense(<ComicManagementTab />);
      case "users":
        return role === "superadmin" || role === "admin" ? withSuspense(<AdminUserManagement />) : null;
      case "audit_logs":
        return role === "superadmin" ? withSuspense(<AdminAuditLogsTab />) : null;
      case "dashboard_access_logs":
        return role === "superadmin" || role === "admin" ? withSuspense(<DashboardAccessLogsTab />) : null;
      case "stories":
        return withSuspense(<StoryManagementTab />);
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
