"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from '@/modules/auth/AuthContext';
import { useAutoSave } from '@/hooks/useAutoSave';
import { Chapter, Story } from '@/types/entities';
import { toast } from "sonner";
import {
  Save,
  BookOpen,
  Hash,
  Type,
  AlignLeft,
} from "lucide-react";
import { useChapterFormPresenter } from '@/hooks/useChapterFormPresenter';

export const ChapterForm: React.FC = () => {
  const { role } = useAuth();
  const canManageChapters = role === 'superadmin' || role === 'admin' || role === 'employee';
  const [formData, setFormData] = useState<Partial<Chapter>>({
    story_id: "",
    chapter_number: 1,
    title: "",
    content: "",
  });
  const [isRestoring, setIsRestoring] = useState(true);
  const hasInitializedRef = useRef(false);

  // Auto-save form data to prevent data loss
  const { restore: restoreAutoSave, clear: clearAutoSave } = useAutoSave(
    'chapter-form',
    formData,
    3000, // Auto-save every 3 seconds
  );

  const { storiesQuery, saveChapterMutation } = useChapterFormPresenter();
  const stories: Story[] = storiesQuery.data ?? [];

  useEffect(() => {
    if (storiesQuery.isLoading || hasInitializedRef.current) return;

    if (stories.length > 0) {
      const restored = restoreAutoSave();
      if (restored && restored.story_id) {
        setFormData((prev) => ({ ...prev, ...restored }));
      } else {
        setFormData((prev) =>
          prev.story_id ? prev : { ...prev, story_id: stories[0].id },
        );
      }
    }

    hasInitializedRef.current = true;
    setIsRestoring(false);
  }, [stories, storiesQuery.isLoading, restoreAutoSave]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.story_id || !formData.title || !formData.content) {
      toast.error("Please fill in all required fields!");
      return;
    }
    if (!formData.chapter_number || formData.chapter_number <= 0) {
      toast.error("Chapter number must be a positive integer!");
      return;
    }
    saveChapterMutation.mutate(formData, {
      onSuccess: () => {
        clearAutoSave();
        setFormData((prev) => ({
          ...prev,
          chapter_number: (prev.chapter_number || 1) + 1,
          title: "",
          content: "",
        }));
      },
    });
  };

  if (isRestoring) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-700 border-t-slate-900 dark:border-t-cyan-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Add New Chapter
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
          Choose a story and fill in chapter content to publish. Your work is auto-saved as you type.
        </p>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-10">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <BookOpen size={12} /> Story
              </label>
              <select
                required
                value={formData.story_id}
                onChange={(e) =>
                  setFormData({ ...formData, story_id: e.target.value })
                }
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner"
              >
                {stories.length === 0 && (
                  <option value="">No stories available</option>
                )}
                {stories.map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <Hash size={12} /> Chapter Number
              </label>
              <input
                type="number"
                required
                min={1}
                value={formData.chapter_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    chapter_number: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <Type size={12} /> Chapter Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Example: Chapter 1: The Beginning"
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <AlignLeft size={12} /> Chapter Content
              </label>
              <textarea
                required
                rows={14}
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Write chapter content here..."
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner resize-none"
              />
            </div>

            <div className="md:col-span-2 pt-4">
              <button
                type="submit"
                disabled={saveChapterMutation.isPending || stories.length === 0 || !canManageChapters}
                className="w-full bg-slate-900 dark:bg-cyan-400 py-5 rounded-3xl text-white dark:text-slate-950 font-black text-sm shadow-2xl shadow-slate-900/10 dark:shadow-cyan-400/20 flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {saveChapterMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={20} />
                    Save & Create Chapter
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

