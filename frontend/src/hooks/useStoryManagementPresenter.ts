'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SupabaseStoryRepository } from '@/infrastructure/repositories/SupabaseStoryRepository';
import { Story } from '@/types/entities';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '@/lib/dbChangeToast';

type StatusFilter = 'all' | 'ongoing' | 'completed';
type SortMode = 'newest' | 'oldest' | 'most_viewed';
type StoryStatus = Story['status'];

const PAGE_SIZE = 10;

export function useStoryManagementPresenter(params: {
  page: number;
  statusFilter: StatusFilter;
  sortMode: SortMode;
  keyword: string;
}) {
  const { page, statusFilter, sortMode, keyword } = params;
  const queryClient = useQueryClient();
  const storyRepo = new SupabaseStoryRepository();

  const storiesQuery = useQuery({
    queryKey: ['admin_stories', { page, statusFilter, sortMode, keyword }],
    queryFn: () =>
      storyRepo.getStoriesPage({
        page,
        pageSize: PAGE_SIZE,
        keyword,
        status: statusFilter,
        sort: sortMode,
      }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    gcTime: 300_000,
  });

  const invalidateStories = () => {
    queryClient.invalidateQueries({ queryKey: ['admin_stories'] });
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-metrics'] });
  };

  const updateStoryMutation = useMutation({
    mutationFn: (payload: { id: string; title: string; description: string; status: StoryStatus }) =>
      storyRepo.updateStory(payload.id, {
        title: payload.title,
        description: payload.description,
        status: payload.status,
      }),
    onMutate: (payload) => {
      const toastId = startDbChangeToast(`Updating "${payload.title}"...`);
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      resolveDbChangeToast(context?.toastId, 'Story updated successfully');
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
      invalidateStories();
    },
    onError: (error, _variables, context) => {
      rejectDbChangeToast(context?.toastId, error, 'save_story');
    },
  });

  return {
    storiesQuery,
    updateStoryMutation,
    deleteStoryMutation,
    bulkStatusMutation,
    bulkDeleteMutation,
  };
}