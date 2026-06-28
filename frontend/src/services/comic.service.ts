import { apiClient } from '@/lib/apiClient';
import { supabase } from '@/infrastructure/supabase/client';

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

type ChapterCreateResponse = {
  chapter: {
    id: string;
    story_id: string;
    chapter_number: number;
    title: string;
    content: string;
    view_count: number;
  };
};

async function uploadFilesToR2(bucket: string, files: File[]): Promise<string[]> {
  const allowDevFallback = process.env.NEXT_PUBLIC_ENABLE_LOCAL_DEV_FALLBACK === 'true';

  const toDevUrls = (): string[] =>
    files.map((file, i) => {
      const safeName = encodeURIComponent(file.name.replace(/\s+/g, '-'));
      return `https://placehold.co/600x800?text=dev+${safeName}+${Date.now() + i}`;
    });

  if (!bucket) {
    if (process.env.NODE_ENV === 'production' || !allowDevFallback) {
      throw new Error('R2 bucket is not configured');
    }
    return toDevUrls();
  }

  const form = new FormData();
  files.forEach((file) => form.append('file', file));

  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    headers['x-r2-bucket'] = bucket;

    const response = await fetch(`${getGatewayUrl()}/api/admin/upload-to-r2`, {
      method: 'POST',
      headers,
      body: form,
    });

    const body = (await response.json()) as { success?: boolean; data?: { urls?: string[] }; urls?: string[]; error?: { message?: string } };
    if (!response.ok || (body.success === false)) {
      if (allowDevFallback && process.env.NODE_ENV !== 'production') return toDevUrls();
      throw new Error(body.error?.message || `HTTP ${response.status}`);
    }
    return body.data?.urls ?? body.urls ?? [];
  } catch (error) {
    if (allowDevFallback && process.env.NODE_ENV !== 'production') return toDevUrls();
    throw error;
  }
}

function getGatewayUrl(): string {
  return process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8787';
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp ? now >= payload.exp - 10 : true;
  } catch {
    return true;
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const sbKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith('sb-') && k.endsWith('-auth-token'),
    );
    if (sbKeys.length > 0) {
      const raw = localStorage.getItem(sbKeys[0]);
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.access_token && !isTokenExpired(session.access_token)) return session.access_token;
      }
    }
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function uploadComicCover(cover: File): Promise<string> {
  const bucket = process.env.NEXT_PUBLIC_R2_BUCKET_COVERS;
  const urls = await uploadFilesToR2(bucket ?? '', [cover]);
  if (urls.length === 0) throw new Error('Unable to upload comic cover');
  return urls[0];
}

export async function uploadChapterImages(images: File[]): Promise<string[]> {
  const bucket = process.env.NEXT_PUBLIC_R2_BUCKET_CHAPTERS;
  return uploadFilesToR2(bucket ?? '', images);
}

export async function createComic(input: CreateComicInput): Promise<ComicContext> {
  const result = await apiClient.post<any>('/api/comics', {
    title: input.title,
    description: input.description,
    cover_url: input.coverUrl,
    author: input.author ?? 'Unknown',
    status: input.status ?? 'ongoing',
    category: input.category ?? [],
  });
  const comic = Array.isArray(result) ? result[0] : result.comic;
  if (!comic) throw new Error('Comic creation succeeded but no comic was returned');
  return comic;
}

export async function createComicChapter(input: ChapterCreateInput): Promise<ChapterCreateResponse['chapter']> {
  const result = await apiClient.post<any>(`/api/comics/${input.comicId}/chapters`, {
    storyId: input.storyId,
    tenantKey: input.tenantKey,
    chapterNumber: input.chapterNumber,
    title: input.title,
    content: input.content,
  });
  const chapter = Array.isArray(result) ? result[0] : result.chapter;
  if (!chapter) throw new Error('Chapter creation succeeded but no chapter was returned');
  return chapter;
}
