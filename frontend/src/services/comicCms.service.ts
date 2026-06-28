import { apiClient } from '@/lib/apiClient';
import type { ComicCmsFormValues, ComicChapterFormValues, ComicStatus } from '@/lib/validation/comicCmsSchemas';
import { uploadChapterImages, uploadComicCover } from './comic.service';

const COMIC_CMS_CATALOG_KEY = 'comic-cms:catalog';

export type PageAsset = {
  id: string;
  assetUrl?: string;
  previewUrl: string;
  fileName: string;
};

export type ComicCmsChapterRecord = {
  id: string;
  chapterNumber: number;
  title: string;
  pages: PageAsset[];
  updatedAt: string;
};

export type ComicCmsRecord = {
  id: string;
  title: string;
  author: string;
  description: string;
  status: ComicStatus;
  coverUrl: string;
  viewCount: number;
  lastUpdatedAt: string;
  chapters: ComicCmsChapterRecord[];
};

export type ComicCatalogFilters = {
  search: string;
  status: string;
  author: string;
};

function readCatalog(): ComicCmsRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMIC_CMS_CATALOG_KEY);
    return raw ? (JSON.parse(raw) as ComicCmsRecord[]) : [];
  } catch (err) {
    console.error('[comicCms] Failed to parse catalog', err);
    return [];
  }
}

function writeCatalog(catalog: ComicCmsRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COMIC_CMS_CATALOG_KEY, JSON.stringify(catalog));
  } catch (err) {
    console.error('[comicCms] Failed to write catalog', err);
  }
}

export function loadComicCatalog(): ComicCmsRecord[] {
  return readCatalog();
}

export function loadComicCatalogFiltered(
  catalog: ComicCmsRecord[],
  filters: ComicCatalogFilters,
): ComicCmsRecord[] {
  return catalog.filter((record) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !record.title.toLowerCase().includes(q) &&
        !record.author.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (filters.status !== 'all' && record.status !== filters.status) return false;
    if (filters.author && record.author !== filters.author) return false;
    return true;
  });
}

export function loadComicRecord(id: string): ComicCmsRecord | null {
  return readCatalog().find((r) => r.id === id) ?? null;
}

export async function fetchComicCatalog(): Promise<ComicCmsRecord[]> {
  try {
    const result = await apiClient.get<any[]>('/api/admin/comics');
    const catalog: ComicCmsRecord[] = Array.isArray(result)
      ? result.map(mapDbRowToRecord)
      : [];
    writeCatalog(catalog);
    return catalog;
  } catch (err) {
    console.error('[comicCms] fetchComicCatalog failed', err);
    return [];
  }
}

function mapDbRowToRecord(row: any): ComicCmsRecord {
  return {
    id: row.id,
    title: row.title || '',
    author: row.author || '',
    description: row.description || '',
    status: (row.status || 'draft') as ComicStatus,
    coverUrl: row.cover_url || '',
    viewCount: row.views ?? 0,
    lastUpdatedAt: row.updated_at || new Date().toISOString(),
    chapters: [],
  };
}

export function saveComicDraft(key: string, data: ComicCmsFormValues): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`comic-cms:draft:${key}`, JSON.stringify(data));
  } catch (err) {
    console.error('[comicCms] Failed to save draft', err);
  }
}

export function loadComicDraft(key: string): ComicCmsFormValues | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`comic-cms:draft:${key}`);
    return raw ? (JSON.parse(raw) as ComicCmsFormValues) : null;
  } catch (err) {
    console.error('[comicCms] Failed to parse draft', err);
    return null;
  }
}

export function clearComicDraft(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`comic-cms:draft:${id}`);
  } catch (err) {
    console.error('[comicCms] Failed to clear draft', err);
  }
}

export function listComicModerationState() {
  if (typeof window === 'undefined') {
    return { keywords: ['spoiler', 'pirated', 'leak'], reportedComments: [] };
  }
  try {
    const raw = localStorage.getItem('comic-cms:moderation');
    return raw ? JSON.parse(raw) : { keywords: ['spoiler', 'pirated', 'leak'], reportedComments: [] };
  } catch {
    return { keywords: ['spoiler', 'pirated', 'leak'], reportedComments: [] };
  }
}

export function saveComicModerationState(state: any): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('comic-cms:moderation', JSON.stringify(state));
  } catch (err) {
    console.error('[comicCms] Failed to save moderation state', err);
  }
}

export function proxiedR2ImageUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('r2') || parsed.hostname.includes('cloudflare')) {
      const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8787';
      return `${gateway}/api/admin/r2?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // ignore invalid URLs
  }
  return url;
}

export function sortFilesByFilename(files: File[]): File[] {
  return [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

export async function createComicFromMetadata(
  input: ComicCmsFormValues & { coverFile?: File | null },
): Promise<ComicCmsRecord> {
  let coverUrl = input.coverUrl || '';
  if (input.coverFile) {
    coverUrl = await uploadComicCover(input.coverFile);
  }
  const result = await apiClient.post<any>('/api/admin/comics', {
    title: input.title,
    author: input.author || 'Unknown',
    description: input.description || '',
    status: input.status || 'draft',
    coverUrl: coverUrl || undefined,
  });
  const created = Array.isArray(result) ? result[0] : result;
  const record = mapDbRowToRecord(created);
  const catalog = readCatalog();
  catalog.unshift(record);
  writeCatalog(catalog);
  return record;
}

export async function updateComicRecord(record: ComicCmsRecord): Promise<ComicCmsRecord> {
  const result = await apiClient.patch<any>(`/api/admin/comics/${record.id}`, {
    title: record.title,
    author: record.author,
    description: record.description,
    status: record.status,
    coverUrl: record.coverUrl,
  });
  const updated = Array.isArray(result) ? result[0] : result;
  const mapped = mapDbRowToRecord(updated);
  const catalog = readCatalog();
  const index = catalog.findIndex((r) => r.id === record.id);
  if (index !== -1) catalog[index] = mapped;
  else catalog.unshift(mapped);
  writeCatalog(catalog);
  return mapped;
}

export async function deleteComic(id: string): Promise<void> {
  await apiClient.delete(`/api/admin/comics/${id}`);
  const catalog = readCatalog();
  writeCatalog(catalog.filter((r) => r.id !== id));
}

export async function createComicChapterFromFiles(
  comic: ComicCmsRecord,
  chapterData: ComicChapterFormValues,
  files: File[],
): Promise<ComicCmsChapterRecord> {
  const chapterId = crypto.randomUUID();
  let imageUrls: string[];
  try {
    imageUrls = await uploadChapterImages(files);
  } catch (err) {
    console.error('[comicCms] uploadChapterImages failed', err);
    imageUrls = files.map((_, i) =>
      `https://placehold.co/600x800?text=chapter+${chapterData.chapterNumber}+page+${i + 1}+${Date.now()}`,
    );
  }

  const chapter: ComicCmsChapterRecord = {
    id: chapterId,
    chapterNumber: chapterData.chapterNumber,
    title: chapterData.title || `Chapter ${chapterData.chapterNumber}`,
    updatedAt: new Date().toISOString(),
    pages: imageUrls.map((url, i) => ({
      id: crypto.randomUUID(),
      assetUrl: url,
      previewUrl: url,
      fileName: files[i]?.name ?? `page-${i + 1}.png`,
    })),
  };

  try {
    const raw = await apiClient.post<any>(
      `/api/admin/comics/${comic.id}/chapters`,
      {
        comicId: comic.id,
        chapterNumber: chapterData.chapterNumber,
        title: chapter.title,
        pageUrls: imageUrls,
      },
    );
    const row = Array.isArray(raw) ? raw[0] : raw;
    const created: ComicCmsChapterRecord = {
      id: row.id || chapter.id,
      chapterNumber: row.chapter_number ?? chapter.chapterNumber,
      title: row.title || chapter.title,
      updatedAt: row.updated_at || new Date().toISOString(),
      pages: (() => {
        try {
          const urls = JSON.parse(row.content || '[]');
          if (!Array.isArray(urls) || urls.length === 0) return chapter.pages;
          return urls.map((url: string) => ({
            id: crypto.randomUUID(),
            assetUrl: url,
            previewUrl: url,
            fileName: url.split('/').pop() || 'page',
          }));
        } catch {
          return chapter.pages;
        }
      })(),
    };
    const catalog = readCatalog();
    const comicIndex = catalog.findIndex((r) => r.id === comic.id);
    if (comicIndex !== -1) {
      catalog[comicIndex].chapters.push(created);
      catalog[comicIndex].lastUpdatedAt = new Date().toISOString();
      writeCatalog(catalog);
    }
    return created;
  } catch (err) {
    console.error('[comicCms] createComicChapterFromFiles API failed, falling back', err);
    const catalog = readCatalog();
    const comicIndex = catalog.findIndex((r) => r.id === comic.id);
    if (comicIndex !== -1) {
      catalog[comicIndex].chapters.push(chapter);
      catalog[comicIndex].lastUpdatedAt = new Date().toISOString();
      writeCatalog(catalog);
    }
    return chapter;
  }
}

export async function recordComicAudit(
  action: string,
  metadata: Record<string, unknown>,
  entityType = 'comic',
  entityId?: string,
): Promise<void> {
  try {
    await apiClient.post('/api/admin/audit', {
      action,
      metadata,
      entity_type: entityType,
      entity_id: entityId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[comicCms] recordComicAudit failed', err);
  }
}

export async function requestComicCachePurge(_params: {
  comicId: string;
  chapterId?: string;
  assetKeys: string[];
}): Promise<void> {
  // TODO: implement CF cache purge when zone ID + API token configured
}
