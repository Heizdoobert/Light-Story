import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { AdManager } from '../components/AdManager';
import { AdminUserManagement } from '../components/AdminUserManagement';
import { StoryForm } from '../components/StoryForm';
import { ChapterForm } from '../components/ChapterForm';
import { UserProfileTab } from '../components/UserProfileTab';
import { SupabaseStoryRepository } from '../infrastructure/repositories/SupabaseStoryRepository';
import { Story } from '../domain/entities';
import { supabase } from '../core/supabase';
import { useAuth } from '../modules/auth/AuthContext';
import { motion } from 'motion/react';

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
  const [activeTab, setActiveTab] = useState('dashboard');
  const { role } = useAuth();

  return (
    <AdminDashboardContent activeTab={activeTab} onTabChange={setActiveTab} role={role} />
  );
};

const AdminDashboardContent: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
  role: string | null;
}> = ({ activeTab, onTabChange, role }) => {
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

  return (
    <AdminLayout activeTab={activeTab} onTabChange={onTabChange}>
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Analytics Overview</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">AJAX polling updates the dashboard automatically while this tab is open.</p>
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              {dashboardQuery.isFetching ? 'Refreshing live data' : `Synced ${dashboardQuery.data ? 'just now' : 'waiting'}`}
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Reads', value: stats.totalViews.toLocaleString(), color: 'bg-blue-500' },
              { label: 'Active Stories', value: stats.activeStories.toString(), color: 'bg-purple-500' },
              { label: 'Total Chapters', value: stats.totalChapters.toString(), color: 'bg-emerald-500' },
              { label: 'Active Readers', value: Math.floor(stats.totalViews / 100).toString(), color: 'bg-orange-500' },
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
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

        {activeTab === 'create_story' && <StoryForm />}

        {activeTab === 'create_chapter' && <ChapterForm />}

        {activeTab === 'ads' && <AdManager />}

        {activeTab === 'profile' && <UserProfileTab />}
        
        {activeTab === 'users' && role === 'superadmin' && <AdminUserManagement />}

        {(activeTab === 'stories' || activeTab === 'settings') && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="text-6xl">🚧</div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Under Construction</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold max-w-sm">This module is currently being refactored to support the new RBAC architecture.</p>
          </div>
        )}
    </AdminLayout>
  );
};
