import React, { useState, useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminLayout } from '../components/AdminLayout';
import { AdManager } from '../components/AdManager';
import { AdminUserManagement } from '../components/AdminUserManagement';
import { IAdminView } from '../presentation/mvp/AdminContract';
import { AdminPresenter } from '../presentation/mvp/AdminPresenter';
import { SupabaseStoryRepository } from '../infrastructure/repositories/SupabaseStoryRepository';
import { SupabaseChapterRepository } from '../infrastructure/repositories/SupabaseChapterRepository';
import { SupabaseSettingsRepository } from '../infrastructure/repositories/SupabaseSettingsRepository';
import { Story } from '../domain/entities';
import { useAuth } from '../modules/auth/AuthContext';
import { motion } from 'motion/react';

const queryClient = new QueryClient();

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stories, setStories] = useState<Story[]>([]);
  const [stats, setStats] = useState({ totalViews: 0, activeStories: 0, totalChapters: 0 });
  const [loading, setLoading] = useState(true);
  const { role } = useAuth();

  const presenter = useMemo(() => {
    return new AdminPresenter(
      new SupabaseStoryRepository(),
      new SupabaseChapterRepository(),
      new SupabaseSettingsRepository()
    );
  }, []);

  useEffect(() => {
    const view: IAdminView = {
      showLoading: () => setLoading(true),
      hideLoading: () => setLoading(false),
      displayStats: (s) => setStats(s),
      displayStories: (data) => setStories(data),
      showSuccess: () => {}, // Handled by components internally
      showError: () => {}
    };

    presenter.attachView(view);
    presenter.loadDashboardData();

    return () => presenter.detachView();
  }, [presenter]);

  return (
    <QueryClientProvider client={queryClient}>
      <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <header>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analytics Overview</h1>
              <p className="text-slate-500 font-medium mt-1">Real-time performance metrics for your library.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Reads', value: stats.totalViews.toLocaleString(), color: 'bg-blue-500' },
                { label: 'Active Stories', value: stats.activeStories.toString(), color: 'bg-purple-500' },
                { label: 'Revenue (Est.)', value: `$${(stats.totalViews * 0.001).toFixed(2)}`, color: 'bg-emerald-500' },
                { label: 'Active Readers', value: Math.floor(stats.totalViews / 100).toString(), color: 'bg-orange-500' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</div>
                    <div className={`w-2 h-2 rounded-full ${stat.color}`}></div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{stat.value}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Recent Stories</h3>
                <button className="text-xs font-bold text-primary hover:underline">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-8 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Title</th>
                      <th className="px-8 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Status</th>
                      <th className="px-8 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Views</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stories.map((story) => (
                      <tr key={story.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-4 font-bold text-slate-900">{story.title}</td>
                        <td className="px-8 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                            story.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {story.status}
                          </span>
                        </td>
                        <td className="px-8 py-4 font-black text-slate-500">{story.views.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ads' && <AdManager />}
        
        {activeTab === 'users' && role === 'superadmin' && <AdminUserManagement />}

        {(activeTab === 'stories' || activeTab === 'settings') && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="text-6xl">🚧</div>
            <h2 className="text-2xl font-black text-slate-900">Under Construction</h2>
            <p className="text-slate-500 font-bold max-w-sm">This module is currently being refactored to support the new RBAC architecture.</p>
          </div>
        )}
      </AdminLayout>
    </QueryClientProvider>
  );
};
