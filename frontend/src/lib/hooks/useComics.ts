"use client";

import { useCallback } from "react";
import { apiClient } from "@/lib/apiClient";

/** @deprecated Use comicCmsService or comicService directly. This hook is kept for backward compat. */
export function useComics() {
  const fetchComics = useCallback(async (): Promise<any[]> => {
    return apiClient.get<any[]>('/api/comics');
  }, []);

  const fetchComicById = useCallback(async (id: string): Promise<any | null> => {
    try {
      return await apiClient.get<any>(`/api/comics/${id}`);
    } catch {
      return null;
    }
  }, []);

  const createComic = useCallback(async (input: any): Promise<any> => {
    return apiClient.post<any>('/api/admin/comics', input);
  }, []);

  const updateComic = useCallback(async (id: string, input: any): Promise<any> => {
    return apiClient.patch<any>(`/api/admin/comics/${id}`, input);
  }, []);

  const deleteComic = useCallback(async (id: string): Promise<void> => {
    await apiClient.delete(`/api/admin/comics/${id}`);
  }, []);

  const createChapter = useCallback(async (input: any): Promise<any> => {
    return apiClient.post(`/api/admin/comics/${input.comicId}/chapters`, input);
  }, []);

  return {
    fetchComics,
    fetchComicById,
    createComic,
    updateComic,
    deleteComic,
    createChapter,
  };
}
