"use client";

import { useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import { ValidationError } from "@/lib/errors";
import { supabase } from "@/infrastructure/supabase/client";

export type ComicContext = {
  id: string;
  tenantKey: string;
  storyId: string;
  title: string;
  slug: string;
  description: string;
  author: string;
  status: 'ongoing' | 'completed';
  category: string[];
  viewCount: number;
  coverUrl: string;
  createdAt?: string;
  updatedAt?: string;
};

type CreateComicInput = {
  title: string;
  description: string;
  coverUrl: string;
  author?: string;
  status?: 'ongoing' | 'completed';
  category?: string[];
};

type ChapterCreateInput = {
  comicId: string;
  tenantKey: string;
  storyId: string;
  chapterNumber: number;
  title: string;
  content: unknown;
};

/**
 * Phase 1 core hook: Comics management.
 * Consolidates ComicService + ComicCmsService + chapter operations.
 */
export function useComics() {
  const getGatewayUrl = useCallback((): string => {
    const isMock = process.env.NEXT_PUBLIC_API_MOCK === 'true';
    if (isMock) return 'http://localhost:4010';
    return process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8787';
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!supabase) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    } catch {
      return null;
    }
  }, []);

  const uploadFilesToR2 = useCallback(async (bucket: string, files: File[]): Promise<string[]> => {
    if (!bucket) {
      if (process.env.NODE_ENV === 'production') {
        throw new ValidationError('R2 bucket is not configured');
      }
      return files.map((file, i) => {
        const safeName = encodeURIComponent(file.name.replace(/\s+/g, '-'));
        return `https://placehold.co/600x800?text=dev+${safeName}+${Date.now() + i}`;
      });
    }

    try {
      const form = new FormData();
      files.forEach((file) => form.append('file', file));

      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      headers['x-r2-bucket'] = bucket;

      const response = await fetch(`${getGatewayUrl()}/api/admin/upload-to-r2`, {
        method: 'POST',
        headers,
        body: form,
      });

      const body = await response.json() as any;
      if (!response.ok || !body.data?.urls) {
        throw new ValidationError('R2 upload failed', body);
      }
      return body.data.urls as string[];
    } catch (error) {
      throw new ValidationError('Failed to upload files to R2', { error });
    }
  }, [getAccessToken, getGatewayUrl]);

  const fetchComics = useCallback(async (): Promise<ComicContext[]> => {
    try {
      return await apiClient.get<ComicContext[]>('/api/comics');
    } catch (error) {
      throw new ValidationError('Failed to fetch comics', { error });
    }
  }, []);

  const fetchComicById = useCallback(async (id: string): Promise<ComicContext | null> => {
    try {
      return await apiClient.get<ComicContext>(`/api/comics/${id}`);
    } catch (error) {
      return null;
    }
  }, []);

  const createComic = useCallback(async (input: CreateComicInput): Promise<ComicContext> => {
    try {
      return await apiClient.post<ComicContext>('/api/admin/comics', input);
    } catch (error) {
      throw new ValidationError('Failed to create comic', { error });
    }
  }, []);

  const updateComic = useCallback(async (id: string, input: Partial<CreateComicInput>): Promise<ComicContext> => {
    try {
      return await apiClient.patch<ComicContext>(`/api/admin/comics/${id}`, input);
    } catch (error) {
      throw new ValidationError('Failed to update comic', { id });
    }
  }, []);

  const deleteComic = useCallback(async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/admin/comics/${id}`);
    } catch (error) {
      throw new ValidationError('Failed to delete comic', { id });
    }
  }, []);

  const createChapter = useCallback(async (input: ChapterCreateInput): Promise<any> => {
    try {
      return await apiClient.post('/api/admin/chapters', input);
    } catch (error) {
      throw new ValidationError('Failed to create chapter', { error });
    }
  }, []);

  return {
    uploadFilesToR2,
    fetchComics,
    fetchComicById,
    createComic,
    updateComic,
    deleteComic,
    createChapter,
  };
}
