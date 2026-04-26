"use client";
import React, { Suspense, lazy, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SupabaseStoryRepository } from '../infrastructure/repositories/SupabaseStoryRepository';
import { Story } from '../domain/entities';
import { supabase } from '../core/supabase';
import { useAuth } from '../modules/auth/AuthContext';
import { parseBooleanSetting, SITE_SETTING_KEYS } from '../lib/systemSettings';

const StoryForm = lazy(() => import('../components/StoryForm').then((m) => ({ default: m.StoryForm })));
const StoryManagementTab = lazy(() => import('../components/StoryManagementTab').then((m) => ({ default: m.StoryManagementTab })));
const ChapterForm = lazy(() => import('../components/ChapterForm').then((m) => ({ default: m.ChapterForm })));
const AdManager = lazy(() => import('../components/AdManager').then((m) => ({ default: m.AdManager })));
const UserProfileTab = lazy(() => import('../components/UserProfileTab').then((m) => ({ default: m.UserProfileTab })));
const CategoryManagementTab = lazy(() => import('../components/CategoryManagementTab').then((m) => ({ default: m.CategoryManagementTab })));
const AuthorManagementTab = lazy(() => import('../components/AuthorManagementTab').then((m) => ({ default: m.AuthorManagementTab })));
const SystemSettingsTab = lazy(() => import('../components/SystemSettingsTab').then((m) => ({ default: m.SystemSettingsTab })));
const AdminUserManagement = lazy(() => import('../components/AdminUserManagement').then((m) => ({ default: m.AdminUserManagement })));
const OperationsCenterTab = lazy(() => import('../components/OperationsCenterTab').then((m) => ({ default: m.OperationsCenterTab })));
const OperationsDataTab = lazy(() => import('../components/OperationsDataTab').then((m) => ({ default: m.OperationsDataTab })));
const AdminAuditLogsTab = lazy(() => import('../components/AdminAuditLogsTab').then((m) => ({ default: m.AdminAuditLogsTab })));
const DashboardAccessLogsTab = lazy(() => import('../components/DashboardAccessLogsTab').then((m) => ({ default: m.DashboardAccessLogsTab })));

type AdminTabId =
  | 'dashboard'
  | 'dashboard_access_logs'
  | 'audit_logs'
  | 'operations_data'
  | 'create_story'
  | 'stories'
  | 'create_chapter'
  | 'categories'
  | 'authors'
  | 'ads'
  | 'settings'
  | 'profile'
  | 'users'
  | 'operations';

const tabPreloaders: Partial<Record<AdminTabId, () => Promise<unknown>>> = {
  create_story: () => import('../components/StoryForm'),
  stories: () => import('../components/StoryManagementTab'),
  create_chapter: () => import('../components/ChapterForm'),
  ads: () => import('../components/AdManager'),
  profile: () => import('../components/UserProfileTab'),
  categories: () => import('../components/CategoryManagementTab'),
  authors: () => import('../components/AuthorManagementTab'),
  settings: () => import('../components/SystemSettingsTab'),
  users: () => import('../components/AdminUserManagement'),
  audit_logs: () => import('../components/AdminAuditLogsTab'),
  dashboard_access_logs: () => import('../components/DashboardAccessLogsTab'),
  operations: () => import('../components/OperationsCenterTab'),
  operations_data: () => import('../components/OperationsDataTab'),
};

const TabLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

type DashboardStats = {
  totalViews: number;
  activeStories: number;
  totalChapters: number;
};

type DashboardData = {
  stories: Story[];
  stats: DashboardStats;
  syncedAt: string;
};

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTabId>('dashboard');
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

// Export as default for Next.js page import
export default AdminDashboard;

const AdminDashboardContent: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
  onTabPrefetch?: (tab: string) => void;
  role: string | null;
  userId: string | null;
}> = ({ activeTab, onTabChange, onTabPrefetch, role, userId }) => {
  const lastAccessLogAtRef = useRef<number>(0);

  useEffect(() => {
    if (!supabase || !userId || activeTab !== 'dashboard') return;

    const now = Date.now();
    if (now - lastAccessLogAtRef.current < 60_000) return;
    lastAccessLogAtRef.current = now;

    void supabase.from('admin_audit_logs').insert({
      actor_user_id: userId,
      action: 'dashboard_access',
      metadata: {
        page: '/admin',
      },
    });
  }, [activeTab, userId]);

  const dashboardQuery = useQuery<DashboardData>({
    queryKey: ['admin-dashboard-metrics'],
    enabled: activeTab === 'dashboard',
    refetchInterval: activeTab === 'dashboard' ? 5000 : false,
    refetchIntervalInBackground: true,
    queryFn: async () => {
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

      const storyRepo = new SupabaseStoryRepository();
      const [stories, chaptersResult] = await Promise.all([
        storyRepo.getStories(),
        supabase.from('chapters').select('id', { count: 'exact', head: true }),
      ]);

      const totalViews = stories.reduce((sum, story) => sum + (story.views || 0), 0);

      return {
        stories,
        stats: {
          totalViews,
          activeStories: stories.length,
          totalChapters: chaptersResult.count ?? 0,
        },
        syncedAt: new Date().toISOString(),
      };
    },
  });

  const stories = dashboardQuery.data?.stories ?? [];
  const stats = dashboardQuery.data?.stats ?? { totalViews: 0, activeStories: 0, totalChapters: 0 };

  const uiSettingsQuery = useQuery({
    queryKey: ['site_settings', 'system_ui_controls'],
    staleTime: 60_000,
    gcTime: 300_000,
    queryFn: async () => {
      if (!supabase) {
        return {
          compactMode: false,
          showSyncBadge: true,
        };
      }

      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('key,value')
          .in('key', [SITE_SETTING_KEYS.uiCompactMode, SITE_SETTING_KEYS.uiShowSyncBadge]);

        if (error) {
          return {
            compactMode: false,
            showSyncBadge: true,
          };
        }

        const map = new Map((data ?? []).map((item: any) => [item.key, item.value]));

        return {
          compactMode: parseBooleanSetting(map.get(SITE_SETTING_KEYS.uiCompactMode), false),
          showSyncBadge: parseBooleanSetting(map.get(SITE_SETTING_KEYS.uiShowSyncBadge), true),
        };
      } catch {
        return {
          compactMode: false,
          showSyncBadge: true,
        };
      }
    },
  });

  const compactMode = uiSettingsQuery.data?.compactMode ?? false;
  const showSyncBadge = uiSettingsQuery.data?.showSyncBadge ?? true;
  const statsCards = useMemo(
    () => [
      { label: 'Total Reads', value: stats.totalViews.toLocaleString(), color: 'bg-blue-500' },
      { label: 'Active Stories', value: stats.activeStories.toString(), color: 'bg-purple-500' },
      { label: 'Total Chapters', value: stats.totalChapters.toString(), color: 'bg-emerald-500' },
      { label: 'Active Readers', value: Math.floor(stats.totalViews / 100).toString(), color: 'bg-orange-500' },
    ],
    [stats],
  );

  return (
    <AdminLayout activeTab={activeTab} onTabChange={onTabChange} onTabPrefetch={onTabPrefetch}>
      {activeTab === 'dashboard' && (
        <div className={compactMode ? 'space-y-5' : 'space-y-8'}>
          <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Analytics Overview</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">AJAX polling updates the dashboard automatically while this tab is open.</p>
            </div>
            {showSyncBadge && (
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                {dashboardQuery.isFetching ? 'Refreshing live data' : `Synced ${dashboardQuery.data ? 'just now' : 'waiting'}`}
              </div>
            )}
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsCards.map((stat) => (
              <div key={stat.label} className={`bg-white dark:bg-slate-900 ${compactMode ? 'p-4' : 'p-6'} rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{stat.label}</div>
                  <div className={`w-2 h-2 rounded-full ${stat.color}`}></div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm transition-colors">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Recent Stories</h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1">Live-synced every 5 seconds</p>
              </div>
              <button className="text-xs font-bold text-primary hover:underline">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-8 py-4 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Title</th>
                    <th className="px-8 py-4 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stories.map((story) => (
                    <tr key={story.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="px-8 py-4 font-bold text-slate-900 dark:text-slate-200">{story.title}</td>
                      <td className="px-8 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          story.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {story.status}
                        </span>
                      </td>
                      <td className="px-8 py-4 font-black text-slate-500 dark:text-slate-400">{story.views.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'operations' && (
        <Suspense fallback={<TabLoadingFallback />}>
          <OperationsCenterTab onNavigate={onTabChange} />
        </Suspense>
      )}

      {activeTab === 'operations_data' && (
        <Suspense fallback={<TabLoadingFallback />}>
          <OperationsDataTab />
        </Suspense>
      )}

      {activeTab === 'create_story' && (
        <Suspense fallback={<TabLoadingFallback />}>
          <StoryForm />
        </Suspense>
      )}

      {activeTab === 'create_chapter' && (
        <Suspense fallback={<TabLoadingFallback />}>
          <ChapterForm />
        </Suspense>
      )}

      {activeTab === 'ads' && (
        <Suspense fallback={<TabLoadingFallback />}>
          <AdManager />
        </Suspense>
      )}

      {activeTab === 'profile' && (
        <Suspense fallback={<TabLoadingFallback />}>
          <UserProfileTab />
        </Suspense>
      )}

      {activeTab === 'categories' && (
        <Suspense fallback={<TabLoadingFallback />}>
          <CategoryManagementTab />
        </Suspense>
      )}

      {activeTab === 'authors' && (
        <Suspense fallback={<TabLoadingFallback />}>
          <AuthorManagementTab />
        </Suspense>
      )}

      {activeTab === 'settings' && (
        <Suspense fallback={<TabLoadingFallback />}>
          <SystemSettingsTab />
        </Suspense>
      )}

      {activeTab === 'users' && role === 'superadmin' && (
        <Suspense fallback={<TabLoadingFallback />}>
          <AdminUserManagement />
        </Suspense>
      )}

      {activeTab === 'audit_logs' && role === 'superadmin' && (
        <Suspense fallback={<TabLoadingFallback />}>
          <AdminAuditLogsTab />
        </Suspense>
      )}

      {activeTab === 'dashboard_access_logs' && (role === 'superadmin' || role === 'admin') && (
        <Suspense fallback={<TabLoadingFallback />}>
          <DashboardAccessLogsTab />
        </Suspense>
      )}

      {activeTab === 'stories' && (
        <Suspense fallback={<TabLoadingFallback />}>
          <StoryManagementTab />
        </Suspense>
      )}
    </AdminLayout>
  );
};
