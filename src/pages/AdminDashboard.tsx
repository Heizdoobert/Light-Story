import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { IAdminView } from '../presentation/mvp/AdminContract';
import { AdminPresenter } from '../presentation/mvp/AdminPresenter';
import { SupabaseStoryRepository } from '../infrastructure/repositories/SupabaseStoryRepository';
import { SupabaseChapterRepository } from '../infrastructure/repositories/SupabaseChapterRepository';
import { SupabaseSettingsRepository } from '../infrastructure/repositories/SupabaseSettingsRepository';
import { Story } from '../domain/entities';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stories, setStories] = useState<Story[]>([]);
  const [stats, setStats] = useState({ totalViews: 0, activeStories: 0, totalChapters: 0 });
  const [loading, setLoading] = useState(true);
  const [adConfigs, setAdConfigs] = useState({
    header: '',
    middle: '',
    sidebar: ''
  });

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
      showSuccess: (msg) => toast.success(msg),
      showError: (msg) => toast.error(msg)
    };

    presenter.attachView(view);
    presenter.loadDashboardData().then(ads => {
      if (ads) {
        setAdConfigs(ads);
      }
    });

    return () => presenter.detachView();
  }, [presenter]);

  const handleSaveAds = async () => {
    await presenter.saveAdConfig('ad_header', adConfigs.header);
    await presenter.saveAdConfig('ad_middle', adConfigs.middle);
    await presenter.saveAdConfig('ad_sidebar', adConfigs.sidebar);
  };

  const bounceClick = {
    whileTap: { scale: 0.92, transition: { type: "spring", stiffness: 400, damping: 10 } },
    whileHover: { scale: 1.02 }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      <aside className="w-72 glass-panel flex flex-col p-6 border-r border-white/40">
        <div className="font-extrabold text-2xl text-primary tracking-tight mb-10 px-3">LightStory.v0</div>
        
        <nav className="space-y-6 flex-1">
          <div>
            <div className="text-[11px] uppercase font-bold text-text-muted mb-4 px-3 tracking-widest">Platform</div>
            <div className="space-y-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                { id: 'stories', label: 'Stories List', icon: '📚' },
                { id: 'ads', label: 'Ad Network', icon: '💰' },
                { id: 'settings', label: 'Settings', icon: '⚙️' }
              ].map((item) => (
                <motion.button 
                  key={item.id}
                  {...bounceClick}
                  onClick={() => {
                    setActiveTab(item.id);
                    toast.info(`Đã chuyển sang mục ${item.label}`);
                  }} 
                  className={`flex items-center w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === item.id 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'text-text-main hover:bg-white/60'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-white/40">
            <motion.button 
              {...bounceClick}
              onClick={() => toast.warning('Chức năng tạo truyện đang phát triển')}
              className="w-full bg-text-main text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-black/10 flex items-center justify-center gap-2"
            >
              <span className="text-xl">+</span>
              Create New Story
            </motion.button>
          </div>
        </nav>

        <div className="mt-auto p-4 bg-white/40 rounded-2xl border border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">AD</div>
            <div>
              <div className="text-xs font-bold">Admin User</div>
              <div className="text-[10px] text-text-muted">Super Admin</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-10 overflow-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <header>
                <h1 className="text-4xl font-black tracking-tight text-text-main">Analytics Overview</h1>
                <p className="text-text-muted font-medium mt-2">Tracking performance across your stories</p>
              </header>

              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: 'Total Reads', value: stats.totalViews.toLocaleString(), color: 'text-blue-600' },
                  { label: 'Active Stories', value: stats.activeStories.toString(), color: 'text-purple-600' },
                  { label: 'Ad Revenue', value: `$${(stats.totalViews * 0.001).toFixed(2)}`, color: 'text-emerald-600' },
                  { label: 'Active Readers', value: Math.floor(stats.totalViews / 100).toString(), color: 'text-orange-600' }
                ].map((stat, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-6 border-b-4 border-b-primary/10"
                  >
                    <div className="text-[10px] font-black text-text-muted mb-3 uppercase tracking-[0.2em]">{stat.label}</div>
                    <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-8">
                <section className="col-span-2 glass-panel rounded-3xl overflow-hidden flex flex-col shadow-sm">
                  <div className="px-8 py-6 border-b border-white/40 flex justify-between items-center bg-white/20">
                    <h3 className="font-black text-lg tracking-tight">Recent Stories</h3>
                    <motion.button {...bounceClick} className="text-xs font-bold text-primary px-4 py-2 bg-primary/5 rounded-full">View All</motion.button>
                  </div>
                  <div className="overflow-auto p-4">
                    <table className="w-full text-sm text-left border-separate border-spacing-y-2">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 font-black text-text-muted text-[11px] uppercase tracking-widest">Title</th>
                          <th className="px-6 py-3 font-black text-text-muted text-[11px] uppercase tracking-widest">Status</th>
                          <th className="px-6 py-3 font-black text-text-muted text-[11px] uppercase tracking-widest">Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stories.map((story) => (
                          <tr key={story.id} className="bg-white/40 hover:bg-white/60 transition-colors group">
                            <td className="px-6 py-5 font-bold rounded-l-2xl group-hover:text-primary transition-colors">{story.title}</td>
                            <td className="px-6 py-5">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                story.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {story.status}
                              </span>
                            </td>
                            <td className="px-6 py-5 font-black text-text-muted rounded-r-2xl">{story.views.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="glass-panel rounded-3xl overflow-hidden flex flex-col shadow-sm">
                  <div className="px-8 py-6 border-b border-white/40 bg-white/20">
                    <h3 className="font-black text-lg tracking-tight">Quick Actions</h3>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                      <div className="text-sm font-bold mb-2">System Health</div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-emerald-600">All systems operational</span>
                      </div>
                    </div>
                    <motion.button 
                      {...bounceClick}
                      className="w-full py-4 bg-white border-2 border-primary text-primary font-black rounded-2xl text-sm shadow-lg shadow-primary/5"
                    >
                      Export Analytics
                    </motion.button>
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {activeTab === 'ads' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl space-y-8"
            >
              <header>
                <h1 className="text-4xl font-black tracking-tight text-text-main">Ad Network</h1>
                <p className="text-text-muted font-medium mt-2">Manage your monetization scripts across the platform</p>
              </header>

              <div className="glass-panel rounded-3xl p-10 space-y-8 shadow-xl">
                <div className="grid grid-cols-1 gap-8">
                  {[
                    { id: 'header', label: 'Header Banner Slot', desc: 'Appears at the top of every chapter' },
                    { id: 'middle', label: 'In-Content (Middle)', desc: 'Injected between paragraphs' },
                    { id: 'sidebar', label: 'Sidebar Sticky', desc: 'Floats on the right side of the reader' }
                  ].map((ad) => (
                    <div key={ad.id} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div>
                          <label className="text-xs font-black text-text-main uppercase tracking-widest">{ad.label}</label>
                          <p className="text-[11px] text-text-muted font-bold mt-1">{ad.desc}</p>
                        </div>
                        <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded">Active</span>
                      </div>
                      <textarea 
                        className="w-full bg-white/60 border-2 border-white/80 rounded-2xl p-5 font-mono text-[12px] h-32 resize-none focus:outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all shadow-inner"
                        value={(adConfigs as any)[ad.id]}
                        onChange={(e) => setAdConfigs({...adConfigs, [ad.id]: e.target.value})}
                        placeholder="Paste your ad script here (HTML/JS)..."
                      />
                    </div>
                  ))}
                </div>
                
                <motion.button 
                  {...bounceClick}
                  onClick={handleSaveAds}
                  className="w-full bg-primary text-white py-5 rounded-2xl font-black text-base shadow-2xl shadow-primary/30 flex items-center justify-center gap-3"
                >
                  <span>💾</span>
                  Save Ad Configurations
                </motion.button>
              </div>
            </motion.div>
          )}

          {(activeTab === 'stories' || activeTab === 'settings') && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-4"
            >
              <div className="text-6xl">🚧</div>
              <h2 className="text-2xl font-black">Under Construction</h2>
              <p className="text-text-muted font-bold">This module is being refactored to the new architecture.</p>
              <motion.button 
                {...bounceClick}
                onClick={() => setActiveTab('dashboard')}
                className="px-8 py-3 bg-text-main text-white rounded-xl font-bold"
              >
                Back to Dashboard
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
