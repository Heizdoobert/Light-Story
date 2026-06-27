"use client";

import { useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import { ValidationError, NotFoundError } from "@/lib/errors";

export type Chapter = {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  content: string;
  view_count: number;
  created_at?: string;
  updated_at?: string;
};

/**
 * Phase 1 core hook: Chapter reader operations.
 * Consolidates ChapterService + ReaderService operations.
 */
export function useChapterReader() {
  const fetchChapter = useCallback(async (storyId: string, chapterNumber: number): Promise<Chapter> => {
    try {
      return await apiClient.get<Chapter>(
        `/api/stories/${storyId}/chapters/${chapterNumber}`
      );
    } catch (error) {
      throw new NotFoundError('Chapter', `${storyId}/${chapterNumber}`);
    }
  }, []);

  const fetchChapters = useCallback(async (storyId: string): Promise<Chapter[]> => {
    try {
      const result = await apiClient.get<Chapter[] | { chapters: Chapter[] }>(
        `/api/stories/${storyId}/chapters`
      );
      return Array.isArray(result) ? result : result.chapters;
    } catch (error) {
      throw new ValidationError('Failed to fetch chapters', { storyId });
    }
  }, []);

  const createChapter = useCallback(async (
    storyId: string,
    payload: Omit<Chapter, 'id' | 'view_count' | 'created_at' | 'updated_at' | 'story_id'>
  ): Promise<Chapter> => {
    try {
      return await apiClient.post<Chapter>(
        `/api/admin/stories/${storyId}/chapters`,
        payload
      );
    } catch (error) {
      throw new ValidationError('Failed to create chapter', { storyId });
    }
  }, []);

  const updateChapter = useCallback(async (
    storyId: string,
    chapterId: string,
    payload: Partial<Chapter>
  ): Promise<Chapter> => {
    try {
      return await apiClient.patch<Chapter>(
        `/api/admin/stories/${storyId}/chapters/${chapterId}`,
        payload
      );
    } catch (error) {
      throw new ValidationError('Failed to update chapter', { storyId, chapterId });
    }
  }, []);

  const deleteChapter = useCallback(async (storyId: string, chapterId: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/admin/stories/${storyId}/chapters/${chapterId}`);
    } catch (error) {
      throw new ValidationError('Failed to delete chapter', { storyId, chapterId });
    }
  }, []);

  const incrementChapterViews = useCallback(async (storyId: string, chapterNumber: number): Promise<void> => {
    try {
      await apiClient.post(
        `/api/stories/${storyId}/chapters/${chapterNumber}/views`,
        {}
      );
    } catch (error) {
      // Non-critical; don't throw
    }
  }, []);

  return {
    fetchChapter,
    fetchChapters,
    createChapter,
    updateChapter,
    deleteChapter,
    incrementChapterViews,
  };
}
