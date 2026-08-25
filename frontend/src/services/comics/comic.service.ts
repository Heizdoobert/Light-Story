import { apiClient } from '@/lib/api/apiClient';
import { ROUTES } from '@/lib/constants/routes';
import { supabase } from '@/lib/supabase/client';
import { getGatewayUrl } from '@/lib/utils/gateway-url';
import { decodeJwtPayload } from '@/lib/utils/jwt';

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
    status: 'uploading' | 'draft' | 'published';
  };
};

const makeDevUrls = (files: File[]) =>
  files.map((f, i) => `https://placehold.co/600x800?text=dev+${encodeURIComponent(f.name.replace(/\s+/g, '-'))}+${Date.now() + i}`);

type UploadOptions = {
  folder?: 'covers' | 'chapters' | 'avatars' | 'uploads';
  comicId?: string;
  chapterNumber?: number;
  userId?: string;
  maxSize?: number;
};

async function convertToWebP(file: File, maxSize?: number): Promise<File> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff'].includes(ext)) return file;

  if (!('createImageBitmap' in window)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    if (maxSize) {
      const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    } else {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close(); return file; }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.85));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, '.webp');
    return new File([blob], name, { type: 'image/webp' });
  } catch {
    return file;
  }
}

async function uploadFilesToR2(bucket: string | undefined, files: File[], options: UploadOptions = {}): Promise<string[]> {
  const allowDevFallback = process.env.NEXT_PUBLIC_ENABLE_LOCAL_DEV_FALLBACK === 'true';

  if (!bucket) {
    if (process.env.NODE_ENV === 'production' || !allowDevFallback) {
      throw new Error('R2 bucket is not configured');
    }
    return makeDevUrls(files);
  }

  const webpFiles = await Promise.all(files.map((f) => convertToWebP(f, options.maxSize)));
  const form = new FormData();
  webpFiles.forEach((file) => form.append('file', file));
  if (options.folder) form.append('folder', options.folder);
  if (options.comicId) form.append('comicId', options.comicId);
  if (options.chapterNumber) form.append('chapterNumber', String(options.chapterNumber));
  if (options.userId) form.append('userId', options.userId);

  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    headers['x-r2-bucket'] = bucket;

    const response = await fetch(`${getGatewayUrl()}${ROUTES.API.ADMIN.R2_UPLOAD_GATEWAY}`, {
      method: 'POST',
      headers,
      body: form,
    });

    const body = (await response.json()) as { success?: boolean; data?: { urls?: string[] }; urls?: string[]; error?: { message?: string } };
    if (!response.ok || (body.success === false)) {
      if (allowDevFallback && process.env.NODE_ENV !== 'production') return makeDevUrls(files);
      throw new Error(body.error?.message || `HTTP ${response.status}`);
    }
    return body.data?.urls ?? body.urls ?? [];
  } catch (error) {
    if (allowDevFallback && process.env.NODE_ENV !== 'production') return makeDevUrls(files);
    throw error;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp ? now >= payload.exp - 10 : true;
}

export async function getAccessToken(): Promise<string | null> {
  if (typeof window !== 'undefined') {
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
    } catch {}
  }
  try {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token ?? null;
    if (token && isTokenExpired(token)) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      return refreshed?.session?.access_token ?? null;
    }
    return token;
  } catch {
    return null;
  }
}

export async function uploadComicCover(cover: File, comicId?: string): Promise<string> {
  const bucket = process.env.NEXT_PUBLIC_R2_BUCKET_COVERS;
  // ponytail: covers render at <=300 CSS px (3x DPR = 900px); 1000px long edge is the ceiling
  const urls = await uploadFilesToR2(bucket, [cover], { folder: 'covers', comicId, maxSize: 1000 });
  if (urls.length === 0) throw new Error('Unable to upload comic cover');
  return urls[0];
}

export async function uploadChapterImages(images: File[], comicId?: string, chapterNumber?: number): Promise<string[]> {
  const bucket = process.env.NEXT_PUBLIC_R2_BUCKET_CHAPTERS;
  // ponytail: 1920px long edge covers full-width 2x readers; raise if hi-dpi zoom matters
  return uploadFilesToR2(bucket, images, { folder: 'chapters', comicId, chapterNumber, maxSize: 1920 });
}

export async function createComic(input: CreateComicInput): Promise<ComicContext> {
  const result = await apiClient.post<ComicContext[] | { comic?: ComicContext }>(ROUTES.API.COMICS, {
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
  const result = await apiClient.post<ChapterCreateResponse['chapter'][] | { chapter?: ChapterCreateResponse['chapter'] }>(ROUTES.API.COMIC_CHAPTERS(input.comicId), {
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

export async function getRecommendations(comicId: string, limit = 6): Promise<ComicContext[]> {
  try {
    const res = await apiClient.get<ComicContext[]>(ROUTES.API.COMICS_RECOMMENDATIONS(comicId, limit));
    return Array.isArray(res) ? res : [];
  } catch {
    const fallback = await apiClient.get<any>(ROUTES.API.COMICS_MOST_VIEWED(limit)).catch(() => []);
    return Array.isArray(fallback) ? fallback : fallback?.items || fallback?.comics || [];
  }
}
