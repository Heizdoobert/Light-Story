"use client";

import { useCallback } from "react";
import { Story } from "@/types/entities";
import { apiClient } from "@/lib/apiClient";
import { NotFoundError, ValidationError } from "@/lib/errors";

export type StoryPageParams = {
  page: number;
  pageSize: number;
  keyword?: string;
  category?: 'all' | string;
  status?: 'all' | Story['status'];
  sort?: 'newest' | 'oldest' | 'most_viewed';
};

export type StoryPageResult = {
  items: Story[];
  total: number;
};

/**
 * Phase 1 core hook: Stories management.
 * Consolidates StoryService + story operations.
 */
export function useStories() {
  const fetchStories = useCallback(async (): Promise<Story[]> => {
    try {
      const result = await apiClient.get<Story[] | { items: Story[] }>('/api/stories');
      return Array.isArray(result) ? result : result.items;
    } catch (error) {
      throw new ValidationError('Failed to fetch stories', { original: error });
    }
  }, []);

  const fetchStoryById = useCallback(async (id: string): Promise<Story | null> => {
    try {
      return await apiClient.get<Story>(`/api/stories/${id}`);
    } catch (error) {
      throw new NotFoundError('Story', id);
    }
  }, []);

  const fetchStoriesPage = useCallback(async (params: StoryPageParams): Promise<StoryPageResult> => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(Math.max(1, params.page ?? 1)));
      searchParams.set('pageSize', String(Math.min(50, Math.max(1, params.pageSize ?? 10))));
      if (params.keyword) searchParams.set('keyword', params.keyword);
      if (params.category && params.category !== 'all') searchParams.set('category', params.category);
      if (params.status && params.status !== 'all') searchParams.set('status', params.status);
      if (params.sort) searchParams.set('sort', params.sort);

      const result = await apiClient.get<Story[] | { items: Story[] }>(`/api/stories?${searchParams.toString()}`);
      const items = Array.isArray(result) ? result : result.items;
      return { items, total: items.length };
    } catch (error) {
      throw new ValidationError('Failed to fetch stories page', { params });
    }
  }, []);

  const incrementViews = useCallback(async (storyId: string): Promise<void> => {
    try {
      await apiClient.post('/api/stories/views', { storyId });
    } catch (error) {
      // Non-critical operation; silent fail
    }
  }, []);

  const saveStory = useCallback(async (story: Partial<Story>): Promise<Story> => {
    try {
      const result = await apiClient.post<Story[] | { story: Story }>('/api/admin/manage-story', { story });
      const created = Array.isArray(result) ? result[0] : result.story;
      if (!created) throw new ValidationError('Story was created but not returned by server');
      return created;
    } catch (error) {
      throw new ValidationError('Failed to save story', { error });
    }
  }, []);

  const updateStory = useCallback(async (
    id: string,
    payload: Pick<Story, 'title' | 'description' | 'status'>,
  ): Promise<Story> => {
    try {
      const result = await apiClient.post<Story[] | { story: Story }>('/api/admin/manage-story', {
        action: 'update',
        id,
        payload,
      });
      const updated = Array.isArray(result) ? result[0] : result.story;
      if (!updated) throw new ValidationError('Story update failed');
      return updated;
    } catch (error) {
      throw new ValidationError('Failed to update story', { id });
    }
  }, []);

  const deleteStory = useCallback(async (id: string): Promise<void> => {
    try {
      await apiClient.post('/api/admin/manage-story', { action: 'delete', id });
    } catch (error) {
      throw new ValidationError('Failed to delete story', { id });
    }
  }, []);

  const bulkUpdateStatus = useCallback(async (ids: string[], status: Story['status']): Promise<void> => {
    try {
      await apiClient.post('/api/admin/manage-story', { action: 'bulkUpdateStatus', ids, status });
    } catch (error) {
      throw new ValidationError('Failed to bulk update story status');
    }
  }, []);

  const bulkDeleteStories = useCallback(async (ids: string[]): Promise<void> => {
    try {
      await apiClient.post('/api/admin/manage-story', { action: 'bulkDelete', ids });
    } catch (error) {
      throw new ValidationError('Failed to bulk delete stories');
    }
  }, []);

  return {
    fetchStories,
    fetchStoryById,
    fetchStoriesPage,
    incrementViews,
    saveStory,
    updateStory,
    deleteStory,
    bulkUpdateStatus,
    bulkDeleteStories,
  };
}
