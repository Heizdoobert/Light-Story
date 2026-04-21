import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SupabaseChapterRepository } from "../infrastructure/repositories/SupabaseChapterRepository";
import { SupabaseStoryRepository } from "../infrastructure/repositories/SupabaseStoryRepository";
import { Chapter, Story } from "../domain/entities";
import { toast } from "sonner";
import { getErrorMessage } from "../lib/errorUtils";
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from "../lib/dbChangeToast";
import {
  Save,
  BookOpen,
  Hash,
  Type,
  AlignLeft,
} from "lucide-react";

export const ChapterForm: React.FC = () => {
  const queryClient = useQueryClient();
  const [stories, setStories] = useState<Story[]>([]);
  const [formData, setFormData] = useState<Partial<Chapter>>({
    story_id: "",
    chapter_number: 1,
    title: "",
    content: "",
  });

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const repo = new SupabaseStoryRepository();
        const data = await repo.getStories();
        setStories(data);
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, story_id: data[0].id }));
        }
      } catch (error) {
        console.error("Error fetching stories:", error);
      }
    };
    fetchStories();
  }, []);

  const chapterRepo = new SupabaseChapterRepository();

  const mutation = useMutation({
    mutationFn: (newChapter: Partial<Chapter>) =>
      chapterRepo.saveChapter(newChapter),
    onMutate: (newChapter) => {
      const title = newChapter.title?.trim() || 'new chapter';
      const toastId = startDbChangeToast(`Creating \"${title}\"...`);
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      resolveDbChangeToast(context?.toastId, "Chapter created successfully");
      setFormData((prev) => ({
        ...prev,
        chapter_number: (prev.chapter_number || 1) + 1,
        title: "",
        content: "",
      }));
    },
    onError: (error: any, _variables, context) => {
      rejectDbChangeToast(context?.toastId, error, "save_chapter");
    },
  });

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
    mutation.mutate(formData);
  };

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Add New Chapter
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
          Choose a story and fill in chapter content to publish.
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
                disabled={mutation.isPending || stories.length === 0}
                className="w-full bg-slate-900 dark:bg-cyan-400 py-5 rounded-3xl text-white dark:text-slate-950 font-black text-sm shadow-2xl shadow-slate-900/10 dark:shadow-cyan-400/20 flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {mutation.isPending ? (
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
