import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, BookOpenText, Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { SupabaseStoryRepository } from '../../infrastructure/repositories/SupabaseStoryRepository';
import { useAuth, UserRole } from '../../modules/auth/AuthContext';
import { Story } from '../../domain/entities';
import { getErrorMessage } from '../../lib/errorUtils';
import { toast } from 'sonner';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '../../lib/dbChangeToast';

type StatusFilter = 'all' | 'ongoing' | 'completed';
type SortMode = 'newest' | 'oldest' | 'most_viewed';
type StoryStatus = Story['status'];

type StoryEditForm = {
  id: string;
  title: string;
  description: string;
  status: StoryStatus;
};

const storyRepo = new SupabaseStoryRepository();
const PAGE_SIZE = 10;

export const StoryManagementTab: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [page, setPage] = useState(1);
  const { role } = useAuth();
  const canManageStories = role === 'superadmin' || role === 'admin';
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingStory, setEditingStory] = useState<StoryEditForm | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [keyword]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, sortMode]);

  const storiesQuery = useQuery({
    queryKey: ['admin_stories', { page, statusFilter, sortMode, keyword: debouncedKeyword }],
    queryFn: () => storyRepo.getStoriesPage({
      page,
      pageSize: PAGE_SIZE,
      keyword: debouncedKeyword,
      status: statusFilter,
      sort: sortMode,
    }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    gcTime: 300_000,
  });

  const stories = storiesQuery.data?.items ?? [];
  const totalStories = storiesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalStories / PAGE_SIZE));
  const totalViews = useMemo(
    () => stories.reduce((sum, item) => sum + (item.views || 0), 0),
    [stories],
  );

  useEffect(() => {
    setSelectedIds((prev) => {
      const filtered = prev.filter((id) => stories.some((story) => story.id === id));
      if (filtered.length === prev.length && filtered.every((id, index) => id === prev[index])) {
        return prev;
      }
      return filtered;
    });
  }, [stories]);

  const invalidateStories = () => {
    queryClient.invalidateQueries({ queryKey: ['admin_stories'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-metrics'] });
  };

  const updateStoryMutation = useMutation({
    mutationFn: (payload: StoryEditForm) =>
      storyRepo.updateStory(payload.id, {
        title: payload.title,
        description: payload.description,
        status: payload.status,
      }),
    onMutate: (payload) => {
      const toastId = startDbChangeToast(`Updating \"${payload.title}\"...`);
      return { toastId };
    },
    onSuccess: () => {
      resolveDbChangeToast(undefined, 'Story updated successfully');
      setEditingStory(null);
      invalidateStories();
    },
    onError: (error, _variables, context) => {
      rejectDbChangeToast(context?.toastId, error, 'save_story');
    },
  });

  const deleteStoryMutation = useMutation({
    mutationFn: (id: string) => storyRepo.deleteStory(id),
    onMutate: () => {
      const toastId = startDbChangeToast('Deleting story...');
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      resolveDbChangeToast(context?.toastId, 'Story deleted successfully');
      invalidateStories();
    },
    onError: (error, _variables, context) => {
      rejectDbChangeToast(context?.toastId, error, 'save_story');
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: StoryStatus }) =>
      storyRepo.bulkUpdateStatus(ids, status),
    onMutate: ({ ids, status }) => {
      const toastId = startDbChangeToast(`Updating ${ids.length} stories to ${status}...`);
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      resolveDbChangeToast(context?.toastId, 'Bulk status updated');
      setSelectedIds([]);
      invalidateStories();
    },
    onError: (error, _variables, context) => {
      rejectDbChangeToast(context?.toastId, error, 'save_story');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => storyRepo.bulkDeleteStories(ids),
    onMutate: (ids) => {
      const toastId = startDbChangeToast(`Deleting ${ids.length} selected stories...`);
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      resolveDbChangeToast(context?.toastId, 'Selected stories deleted');
      setSelectedIds([]);
      invalidateStories();
    },
    onError: (error, _variables, context) => {
      rejectDbChangeToast(context?.toastId, error, 'save_story');
    },
  });

  const allVisibleSelected = stories.length > 0 && stories.every((story) => selectedIds.includes(story.id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !stories.some((story) => story.id === id)));
      return;
    }

    const merged = new Set(selectedIds);
    stories.forEach((story) => merged.add(story.id));
    setSelectedIds(Array.from(merged));
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleDeleteOne = (story: Story) => {
    if (!window.confirm(`Delete story \"${story.title}\"? This action cannot be undone.`)) return;
    deleteStoryMutation.mutate(story.id);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected stories? This action cannot be undone.`)) return;
    bulkDeleteMutation.mutate(selectedIds);
  };

  const isMutating =
    updateStoryMutation.isPending ||
    deleteStoryMutation.isPending ||
    bulkStatusMutation.isPending ||
    bulkDeleteMutation.isPending;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Stories</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Manage and monitor all stories in one place.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-right">
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">Total stories</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">{totalStories}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-right">
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">Total views</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">{totalViews.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <label className="lg:col-span-2 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search title, author, category..."
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-11 pr-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All status</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>

          <div className="flex items-center gap-2">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="most_viewed">Most viewed</option>
            </select>

            <button
              type="button"
              onClick={() => storiesQuery.refetch()}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Refresh stories"
            >
              <RefreshCw size={16} className={storiesQuery.isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={selectedIds.length === 0 || isMutating || !canManageStories}
            onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'ongoing' })}
            className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 disabled:opacity-50"
          >
            Mark Ongoing ({selectedIds.length})
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0 || isMutating || !canManageStories}
            onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'completed' })}
            className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 disabled:opacity-50"
          >
            Mark Completed ({selectedIds.length})
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0 || isMutating || !canManageStories}
            onClick={handleBulkDelete}
            className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-red-200 text-red-600 dark:border-red-700 dark:text-red-300 disabled:opacity-50"
          >
            Delete Selected ({selectedIds.length})
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {storiesQuery.isLoading && (
          <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
            <RefreshCw size={22} className="animate-spin text-primary" />
            <p className="font-bold text-slate-500 dark:text-slate-400">Loading stories...</p>
          </div>
        )}

        {storiesQuery.isError && (
          <div className="p-8 text-center">
            <p className="font-bold text-red-600 dark:text-red-400">{getErrorMessage(storiesQuery.error, 'fetch_stories')}</p>
          </div>
        )}

        {!storiesQuery.isLoading && !storiesQuery.isError && stories.length === 0 && (
          <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
            <BookOpenText size={26} className="text-slate-400" />
            <p className="font-black text-slate-700 dark:text-slate-200">No stories found</p>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Try changing filters or create a new story.</p>
          </div>
        )}

        {!storiesQuery.isLoading && !storiesQuery.isError && stories.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-4">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Title</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Author</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Category</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Views</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stories.map((story: Story) => (
                  <tr key={story.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(story.id)}
                        onChange={() => toggleSelectOne(story.id)}
                      />
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 min-w-[260px]">{story.title}</td>
                    <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{story.author || '-'}</td>
                    <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{story.category || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          story.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}
                      >
                        {story.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-500 dark:text-slate-300">{(story.views || 0).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingStory({
                              id: story.id,
                              title: story.title,
                              description: story.description,
                              status: story.status,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-bold"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOne(story)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-700 px-2 py-1 text-xs font-bold text-red-600 dark:text-red-300"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!storiesQuery.isLoading && !storiesQuery.isError && totalStories > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Page {page} of {totalPages} ({totalStories.toLocaleString()} stories)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-50"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-50"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      {editingStory && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Edit Story</h2>
              <button type="button" onClick={() => setEditingStory(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Title</label>
                <input
                  value={editingStory.title}
                  onChange={(e) => setEditingStory({ ...editingStory, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Description</label>
                <textarea
                  rows={4}
                  value={editingStory.description}
                  onChange={(e) => setEditingStory({ ...editingStory, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Status</label>
                <select
                  value={editingStory.status}
                  onChange={(e) => setEditingStory({ ...editingStory, status: e.target.value as StoryStatus })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold"
                >
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStory(null)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canManageStories || updateStoryMutation.isPending || !editingStory.title.trim()}
                  onClick={() => updateStoryMutation.mutate(editingStory)}
                  className="rounded-xl bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 px-4 py-2 text-sm font-bold disabled:opacity-50"
                >
                  {updateStoryMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

