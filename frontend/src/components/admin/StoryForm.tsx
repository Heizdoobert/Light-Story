import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SupabaseStoryRepository } from "../../infrastructure/repositories/SupabaseStoryRepository";
import { SupabaseTaxonomyRepository } from "../../infrastructure/repositories/SupabaseTaxonomyRepository";
import { useAuth } from "../../modules/auth/AuthContext";
import { Story } from '@/types/entities';
import { toast } from "sonner";
import { getErrorMessage } from "../../lib/errorUtils";
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from "../../lib/dbChangeToast";
import { supabase } from '@/lib/supabase/client';
import {
  Save,
  X,
  Image as ImageIcon,
  Type,
  User,
  BookOpen,
  Tag,
  Activity,
  Upload,
} from "lucide-react";

export const StoryForm: React.FC = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const canManageStories = role === 'superadmin' || role === 'admin';
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [formData, setFormData] = useState<Partial<Story>>({
    title: "",
    description: "",
    author: "",
    author_id: null,
    cover_url: "",
    category: "",
    category_id: null,
    status: "ongoing",
    views: 0,
  });

  const storyRepo = new SupabaseStoryRepository();
  const taxonomyRepo = new SupabaseTaxonomyRepository();

  const authorsQuery = useQuery({
    queryKey: ["authors"],
    queryFn: () => taxonomyRepo.getAuthors(),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => taxonomyRepo.getCategories(),
  });

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(coverFile);
    setCoverPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [coverFile]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      author: "",
      author_id: null,
      cover_url: "",
      category: "",
      category_id: null,
      status: "ongoing",
      views: 0,
    });
    setCoverFile(null);
    setFileInputKey((current) => current + 1);
  };

  const uploadCoverImage = async (file: File): Promise<string> => {
    if (!supabase) {
      throw new Error("Supabase not initialized");
    }

    const fileExtension = file.name.split(".").pop() || "png";
    const filePath = `story-covers/${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("story-covers")
      .upload(filePath, file, {
        contentType: file.type || "image/png",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("story-covers").getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error("Unable to resolve uploaded image URL");
    }

    return data.publicUrl;
  };

  const mutation = useMutation({
    mutationFn: async (newStory: Partial<Story>) => {
      if (!coverFile) {
        throw new Error("Cover image is required");
      }

      const coverUrl = await uploadCoverImage(coverFile);
      return storyRepo.saveStory({ ...newStory, cover_url: coverUrl });
    },
    onMutate: (newStory) => {
      const title = newStory.title?.trim() || 'new story';
      const toastId = startDbChangeToast(`Creating \"${title}\"...`);
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["admin_stories"] });
      resolveDbChangeToast(context?.toastId, "Story created successfully");
      resetForm();
    },
    onError: (error: any, _variables, context) => {
      rejectDbChangeToast(context?.toastId, error, "save_story");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author || !formData.description) {
      toast.error("Please write full form required!!!");
      return;
    }
    if (!formData.author_id || !formData.category_id) {
      toast.error("Please choose an author and category from linked records");
      return;
    }
    if (!coverFile) {
      toast.error("Please upload a cover image");
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Create New Story
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
          Your content will be safe in this tab until your save this session and
          change tab.
        </p>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-10">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            <div className="space-y-6 md:col-span-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                  <Type size={12} /> Title story
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Example: Light at the End of the Road"
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <User size={12} /> Author
              </label>
              <select
                required
                value={formData.author_id ?? ""}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedAuthor = authorsQuery.data?.find((item) => item.id === selectedId);
                  setFormData({
                    ...formData,
                    author_id: selectedId || null,
                    author: selectedAuthor?.name || "",
                  });
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner"
              >
                <option value="">{authorsQuery.isLoading ? "Loading authors..." : "Select author"}</option>
                {(authorsQuery.data ?? []).map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <Tag size={12} /> Category
              </label>
              <select
                required
                value={formData.category_id ?? ""}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedCategory = categoriesQuery.data?.find((item) => item.id === selectedId);
                  setFormData({
                    ...formData,
                    category_id: selectedId || null,
                    category: selectedCategory?.name || "",
                  });
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner"
              >
                <option value="">{categoriesQuery.isLoading ? "Loading categories..." : "Select category"}</option>
                {(categoriesQuery.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <ImageIcon size={12} /> Upload main background
              </label>
              <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 p-4 space-y-4">
                {coverPreview ? (
                  <div className="space-y-3">
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="h-56 w-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-xl bg-white/80 dark:bg-slate-900/80 px-4 py-3 border border-slate-200 dark:border-slate-800">
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400">Selected file</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{coverFile?.name}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCoverFile(null);
                          setFileInputKey((current) => current + 1);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white dark:bg-cyan-400 dark:text-slate-950"
                      >
                        <X size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 px-6 py-8 text-center">
                    <Upload size={22} className="text-primary" />
                    <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                      Choose an image from your device
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      PNG, JPG, JPEG, WebP
                    </p>
                  </div>
                )}

                <input
                  key={fileInputKey}
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setCoverFile(file);
                  }}
                  className="block w-full cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-black file:text-white dark:file:bg-primary dark:file:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <Activity size={12} /> Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as any })
                }
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner"
              >
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <BookOpen size={12} /> Description content
              </label>
              <textarea
                required
                rows={6}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Write a short summary of the story..."
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner resize-none"
              />
            </div>

            <div className="md:col-span-2 pt-4">
              <button
                type="submit"
                disabled={mutation.isPending || !canManageStories}
                className="w-full bg-slate-900 dark:bg-cyan-400 py-5 rounded-3xl text-white dark:text-slate-950 font-black text-sm shadow-2xl shadow-slate-900/10 dark:shadow-cyan-400/20 flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={20} />
                    Save & Create Story
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

