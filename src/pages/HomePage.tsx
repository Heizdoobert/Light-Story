import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, LogOut, LayoutDashboard, BookOpen, User as UserIcon } from 'lucide-react';
import { SupabaseStoryRepository } from '../infrastructure/repositories/SupabaseStoryRepository';
import { Story } from '../domain/entities';
import { useAuth } from '../modules/auth/AuthContext';
import { toast } from 'sonner';
import { LoginModal } from '../shared/components/LoginModal';

export const HomePage: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user, profile, signIn, signOut, role } = useAuth();

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const repo = new SupabaseStoryRepository();
        const data = await repo.getStories();
        setStories(data);
      } catch (error) {
        console.error('Error fetching stories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, []);

  const bounceClick = {
    whileTap: { scale: 0.95 },
    whileHover: { scale: 1.02 }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4 bg-[#f8fafc] dark:bg-slate-950">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-text-muted dark:text-slate-400 font-bold animate-pulse">Đang tải danh sách truyện...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] transition-colors duration-300 dark:bg-slate-950">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-white/40 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black">L</div>
          <span className="font-black text-xl tracking-tighter text-text-main dark:text-white">LightStory.v0</span>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              {['superadmin', 'admin', 'employee'].includes(role || '') && (
                <Link to="/admin">
                  <motion.button 
                    {...bounceClick}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors"
                  >
                    <LayoutDashboard size={14} />
                    Dashboard
                  </motion.button>
                </Link>
              )}
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-black text-text-main dark:text-white">{profile?.full_name || user.email}</div>
                  <div className="text-[10px] font-bold text-primary uppercase tracking-widest">{role}</div>
                </div>
                <img 
                  src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'User'}&background=random`} 
                  alt="Avatar" 
                  className="w-9 h-9 rounded-xl border-2 border-white shadow-sm object-cover"
                />
                <motion.button 
                  {...bounceClick}
                  onClick={() => {
                    signOut();
                    toast.success('Đã đăng xuất');
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut size={18} />
                </motion.button>
              </div>
            </div>
          ) : (
            <motion.button 
              {...bounceClick}
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-text-main text-white rounded-xl text-sm font-bold shadow-lg shadow-black/10"
            >
              <LogIn size={16} />
              Đăng nhập
            </motion.button>
          )}
        </div>
      </nav>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      <div className="max-w-7xl mx-auto p-8 lg:p-12">
        <header className="mb-16 text-center space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl lg:text-6xl font-black text-text-main dark:text-white tracking-tight"
          >
            Đọc truyện <span className="text-primary">tối giản</span>.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-text-muted dark:text-slate-400 text-lg font-medium max-w-2xl mx-auto"
          >
            Trải nghiệm đọc truyện chữ thuần túy với giao diện hiện đại, không quảng cáo phiền nhiễu và hỗ trợ đa nền tảng.
          </motion.p>
        </header>

        {stories.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-20 glass-panel rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800"
          >
            <div className="text-5xl mb-6">📚</div>
            <p className="text-text-muted dark:text-slate-400 font-bold mb-6 text-lg">Chưa có truyện nào trong hệ thống.</p>
            {['superadmin', 'admin', 'employee'].includes(role || '') && (
              <Link to="/admin">
                <motion.button {...bounceClick} className="btn-primary px-8 py-3">
                  Tạo truyện ngay
                </motion.button>
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {stories.map((story, i) => (
              <motion.div 
                key={story.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card group flex flex-col hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 border border-white/40"
              >
                <div className="relative overflow-hidden rounded-2xl mb-5 aspect-[3/4]">
                  <img 
                    src={story.cover_url || `https://picsum.photos/seed/${story.id}/400/600`} 
                    alt={story.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                    <span className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <BookOpen size={14} />
                      Đọc ngay
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg ${
                      story.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {story.status}
                    </span>
                  </div>
                </div>
                
                <h2 className="text-xl font-black mb-2 text-text-main dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                  {story.title}
                </h2>
                <p className="text-text-muted dark:text-slate-400 text-xs font-bold mb-6 line-clamp-2 flex-1 leading-relaxed">
                  {story.description}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-tighter">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    {story.views.toLocaleString()} lượt xem
                  </div>
                  <Link 
                    to={`/story/${story.id}/chapter/1`} // Giả định chapter 1 luôn tồn tại hoặc logic xử lý sau
                    className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-text-main dark:text-white hover:bg-primary hover:text-white transition-all"
                  >
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <footer className="mt-20 py-12 border-t border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <div className="w-6 h-6 bg-slate-400 rounded flex items-center justify-center text-white font-black text-[10px]">L</div>
            <span className="font-black text-sm tracking-tighter text-slate-500 dark:text-slate-400">LightStory.v0</span>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold">© 2026 LightStory. All rights reserved.</p>
          <div className="flex gap-8">
            <Link to="/admin" className="text-xs font-black text-slate-400 dark:text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">Admin Panel</Link>
            <a href="#" className="text-xs font-black text-slate-400 dark:text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const ChevronRight = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);
