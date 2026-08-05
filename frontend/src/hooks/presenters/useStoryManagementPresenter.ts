'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchStoriesPage } from '@/services/comics/story.service';
import * as adminStoriesActions from '@/actions/admin-stories.actions';
import { Story } from '@/types/entities';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '@/lib/utils/db-change-toast';

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

  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

  const updateStoryMutation = {
    isPending: isUpdating,
    mutate: async (
      payload: { id: string; title: string; description: string; status: StoryStatus },
      options?: { onSuccess?: () => void }
    ) => {
      setIsUpdating(true);
      const toastId = startDbChangeToast(`Updating "${payload.title}"...`);
      try {
        const res = await adminStoriesActions.updateStory({
          id: payload.id,
          title: payload.title,
          description: payload.description,
          status: payload.status,
        });
        if (!res?.success) {
          rejectDbChangeToast(toastId, res?.error ?? 'Operation failed', 'save_story');
          return;
        }
        invalidateStories();
        resolveDbChangeToast(toastId, 'Story updated successfully');
        options?.onSuccess?.();
      } catch (error: any) {
        rejectDbChangeToast(toastId, error?.message ?? error, 'save_story');
      } finally {
        setIsUpdating(false);
      }
    },
  };

  const deleteStoryMutation = {
    isPending: isDeleting,
    mutate: async (id: string, options?: { onSuccess?: () => void }) => {
      setIsDeleting(true);
      const toastId = startDbChangeToast('Deleting story...');
      try {
        const res = await adminStoriesActions.deleteStory({ id });
        if (!res?.success) {
          rejectDbChangeToast(toastId, res?.error ?? 'Operation failed', 'save_story');
          return;
        }
        invalidateStories();
        resolveDbChangeToast(toastId, 'Story deleted successfully');
        options?.onSuccess?.();
      } catch (error: any) {
        rejectDbChangeToast(toastId, error?.message ?? error, 'save_story');
      } finally {
        setIsDeleting(false);
      }
    },
  };

  const bulkStatusMutation = {
    isPending: isBulkUpdatingStatus,
    mutate: async (
      { ids, status }: { ids: string[]; status: StoryStatus },
      options?: { onSuccess?: () => void }
    ) => {
      setIsBulkUpdatingStatus(true);
      const toastId = startDbChangeToast(`Updating ${ids.length} stories to ${status}...`);
      try {
        const res = await adminStoriesActions.bulkUpdateStatus({ ids, status });
        if (!res?.success) {
          rejectDbChangeToast(toastId, res?.error ?? 'Operation failed', 'save_story');
          return;
        }
        invalidateStories();
        resolveDbChangeToast(toastId, 'Bulk status updated');
        options?.onSuccess?.();
      } catch (error: any) {
        rejectDbChangeToast(toastId, error?.message ?? error, 'save_story');
      } finally {
        setIsBulkUpdatingStatus(false);
      }
    },
  };

  const bulkDeleteMutation = {
    isPending: isBulkDeleting,
    mutate: async (ids: string[], options?: { onSuccess?: () => void }) => {
      setIsBulkDeleting(true);
      const toastId = startDbChangeToast(`Deleting ${ids.length} selected stories...`);
      try {
        const res = await adminStoriesActions.bulkDeleteStories({ ids });
        if (!res?.success) {
          rejectDbChangeToast(toastId, res?.error ?? 'Operation failed', 'save_story');
          return;
        }
        invalidateStories();
        resolveDbChangeToast(toastId, 'Selected stories deleted');
        options?.onSuccess?.();
      } catch (error: any) {
        rejectDbChangeToast(toastId, error?.message ?? error, 'save_story');
      } finally {
        setIsBulkDeleting(false);
      }
    },
  };

  return {
    storiesQuery,
    updateStoryMutation,
    deleteStoryMutation,
    bulkStatusMutation,
    bulkDeleteMutation,
  };
}
