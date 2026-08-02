'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchStoriesPage } from '@/services/comics/story.service';
import * as adminStoriesActions from '@/actions/admin-stories.actions';
import { Story } from '@/types/entities';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '@/lib/utils/dbChangeToast';

type StatusFilter = 'all' | 'draft' | 'published' | 'ongoing' | 'completed';
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

  const storiesQuery = useQuery({
    queryKey: ['admin_stories', { page, statusFilter, sortMode, keyword }],
    queryFn: () =>
      fetchStoriesPage({
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
      adminStoriesActions.updateStory({
        id: payload.id,
        title: payload.title,
        description: payload.description,
        status: payload.status,
      }),
    onMutate: (payload) => {
      const toastId = startDbChangeToast(`Updating "${payload.title}"...`);
      return { toastId };
    },
    onSuccess: (data, _variables, context) => {
      if (!data?.success) {
        rejectDbChangeToast(context?.toastId, data?.error ?? 'Operation failed', 'save_story');
        return;
      }
      invalidateStories();
      resolveDbChangeToast(context?.toastId, 'Story updated successfully');
    },
    onError: (error, _variables, context) => {
      rejectDbChangeToast(context?.toastId, error, 'save_story');
    },
  });

  const deleteStoryMutation = useMutation({
    mutationFn: (id: string) => adminStoriesActions.deleteStory({ id }),
    onMutate: () => {
      const toastId = startDbChangeToast('Deleting story...');
      return { toastId };
    },
    onSuccess: (data, _variables, context) => {
      if (!data?.success) {
        rejectDbChangeToast(context?.toastId, data?.error ?? 'Operation failed', 'save_story');
        return;
      }
      invalidateStories();
      resolveDbChangeToast(context?.toastId, 'Story deleted successfully');
    },
    onError: (error, _variables, context) => {
      rejectDbChangeToast(context?.toastId, error, 'save_story');
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: StoryStatus }) =>
      adminStoriesActions.bulkUpdateStatus({ ids, status }),
    onMutate: ({ ids, status }) => {
      const toastId = startDbChangeToast(`Updating ${ids.length} stories to ${status}...`);
      return { toastId };
    },
    onSuccess: (data, _variables, context) => {
      if (!data?.success) {
        rejectDbChangeToast(context?.toastId, data?.error ?? 'Operation failed', 'save_story');
        return;
      }
      invalidateStories();
      resolveDbChangeToast(context?.toastId, 'Bulk status updated');
    },
    onError: (error, _variables, context) => {
      rejectDbChangeToast(context?.toastId, error, 'save_story');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => adminStoriesActions.bulkDeleteStories({ ids }),
    onMutate: (ids) => {
      const toastId = startDbChangeToast(`Deleting ${ids.length} selected stories...`);
      return { toastId };
    },
    onSuccess: (data, _variables, context) => {
      if (!data?.success) {
        rejectDbChangeToast(context?.toastId, data?.error ?? 'Operation failed', 'save_story');
        return;
      }
      invalidateStories();
      resolveDbChangeToast(context?.toastId, 'Selected stories deleted');
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
