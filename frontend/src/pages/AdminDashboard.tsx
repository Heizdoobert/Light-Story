import React, { Suspense, lazy, startTransition, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { SupabaseStoryRepository } from '../infrastructure/repositories/SupabaseStoryRepository';
import { Story } from '../domain/entities';
import { supabase } from '../core/supabase';
import { useAuth } from '../modules/auth/AuthContext';
import { parseBooleanSetting, SITE_SETTING_KEYS } from '../lib/systemSettings';

const StoryForm = lazy(() => import('../components/StoryForm').then((m) => ({ default: m.StoryForm })));
const ChapterForm = lazy(() => import('../components/ChapterForm').then((m) => ({ default: m.ChapterForm })));
const AdManager = lazy(() => import('../components/AdManager').then((m) => ({ default: m.AdManager })));
const UserProfileTab = lazy(() => import('../components/UserProfileTab').then((m) => ({ default: m.UserProfileTab })));
const CategoryManagementTab = lazy(() => import('../components/CategoryManagementTab').then((m) => ({ default: m.CategoryManagementTab })));
const AuthorManagementTab = lazy(() => import('../components/AuthorManagementTab').then((m) => ({ default: m.AuthorManagementTab })));
const SystemSettingsTab = lazy(() => import('../components/SystemSettingsTab').then((m) => ({ default: m.SystemSettingsTab })));
const AdminUserManagement = lazy(() => import('../components/AdminUserManagement').then((m) => ({ default: m.AdminUserManagement })));

type AdminTabId =
  | 'dashboard'
  | 'create_story'
  | 'stories'
  | 'create_chapter'
  | 'categories'
  | 'authors'
  | 'ads'
  | 'settings'
  | 'profile'
  | 'users';

const tabPreloaders: Partial<Record<AdminTabId, () => Promise<unknown>>> = {
  create_story: () => import('../components/StoryForm'),
  create_chapter: () => import('../components/ChapterForm'),
  ads: () => import('../components/AdManager'),
  profile: () => import('../components/UserProfileTab'),
  categories: () => import('../components/CategoryManagementTab'),
  authors: () => import('../components/AuthorManagementTab'),
  settings: () => import('../components/SystemSettingsTab'),
  users: () => import('../components/AdminUserManagement'),
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
  const { role } = useAuth();

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
    />
  );
};

const AdminDashboardContent: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
  onTabPrefetch?: (tab: string) => void;
  role: string | null;
}> = ({ activeTab, onTabChange, onTabPrefetch, role }) => {
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
            {[
              { label: 'Total Reads', value: stats.totalViews.toLocaleString(), color: 'bg-blue-500' },
              { label: 'Active Stories', value: stats.activeStories.toString(), color: 'bg-purple-500' },
              { label: 'Total Chapters', value: stats.totalChapters.toString(), color: 'bg-emerald-500' },
              { label: 'Active Readers', value: Math.floor(stats.totalViews / 100).toString(), color: 'bg-orange-500' },
            ].map((stat, i) => (
              <div key={i} className={`bg-white dark:bg-slate-900 ${compactMode ? 'p-4' : 'p-6'} rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{stat.label}</div>
                  <div className={`w-2 h-2 rounded-full ${stat.color}`}></div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
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

        {activeTab === 'stories' && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="text-6xl">🚧</div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Under Construction</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold max-w-sm">This module is currently being refactored to support the new RBAC architecture.</p>
          </div>
        )}
    </AdminLayout>
  );
};
