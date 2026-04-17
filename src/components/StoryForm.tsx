import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseStoryRepository } from '../infrastructure/repositories/SupabaseStoryRepository';
import { Story } from '../domain/entities';
import { toast } from 'sonner';
import { getErrorMessage } from '../lib/errorUtils';
import { Save, X, PlusCircle, Image as ImageIcon, Type, User, BookOpen, Tag, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const StoryForm: React.FC = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<Story>>({
    title: '',
    description: '',
    author: '',
    cover_url: '',
    category: '',
    status: 'ongoing',
    views: 0
  });

  const storyRepo = new SupabaseStoryRepository();

  const mutation = useMutation({
    mutationFn: (newStory: Partial<Story>) => storyRepo.saveStory(newStory),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_stories'] });
      toast.success('Truyện mới đã được tạo thành công!');
      setFormData({
        title: '',
        description: '',
        author: '',
        cover_url: '',
        category: '',
        status: 'ongoing',
        views: 0
      });
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'save_story'));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author || !formData.description) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc');
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Tạo Truyện Mới</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Nội dung của bạn sẽ được an toàn trong tab này cho đến khi bạn lưu hoặc chuyển trang.</p>
      </header>
      
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-10">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6 md:col-span-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                  <Type size={12} /> Tiêu đề truyện
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: Ánh Sáng Cuối Con Đường"
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <User size={12} /> Tác giả
              </label>
              <input
                type="text"
                required
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Tên tác giả"
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <Tag size={12} /> Thể loại
              </label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ví dụ: Tiên Hiệp, Đô Thị"
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <ImageIcon size={12} /> Link Ảnh Bìa
              </label>
              <input
                type="url"
                required
                value={formData.cover_url}
                onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <Activity size={12} /> Trạng thái
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner"
              >
                <option value="ongoing">Đang tiến hành</option>
                <option value="completed">Đã hoàn thành</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <BookOpen size={12} /> Mô tả nội dung
              </label>
              <textarea
                required
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Viết tóm tắt về câu chuyện..."
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner resize-none"
              />
            </div>

            <div className="md:col-span-2 pt-4">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full bg-slate-900 dark:bg-primary py-5 rounded-3xl text-white font-black text-sm shadow-2xl shadow-slate-900/10 dark:shadow-primary/20 flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={20} />
                    Lưu & Tạo Truyện
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
