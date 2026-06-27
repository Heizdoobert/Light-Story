import { apiClient } from '@/lib/apiClient';
import type { ComicCmsFormValues, ComicChapterFormValues, ComicModerationState, ComicStatus } from '@/lib/validation/comicCmsSchemas';
import { uploadChapterImages } from './comic.service';

const COMIC_CMS_CATALOG_KEY = 'comic-cms:catalog';
const COMIC_CMS_DRAFT_PREFIX = 'comic-cms:draft:';
const COMIC_CMS_MODERATION_KEY = 'comic-cms:moderation';

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
  status: ComicStatus;
  scheduledAt: string | null;
  pages: PageAsset[];
  updatedAt: string;
};

export type ComicCmsRecord = {
  id: string;
  slug: string;
  storyId: string;
  title: string;
  author: string;
  artist: string;
  translator: string;
  source: string;
  description: string;
  status: ComicStatus;
  scheduledAt: string | null;
  genres: string[];
  tags: string[];
  rankScore: number;
  coverUrl: string;
  viewCount: number;
  lastUpdatedAt: string;
  chapters: ComicCmsChapterRecord[];
};

export type ComicCatalogFilters = {
  search: string;
  genre: string;
  status: string;
  author: string;
};

function readCatalog(): ComicCmsRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMIC_CMS_CATALOG_KEY);
    return raw ? (JSON.parse(raw) as ComicCmsRecord[]) : [];
  } catch {
    return [];
  }
}

function writeCatalog(catalog: ComicCmsRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COMIC_CMS_CATALOG_KEY, JSON.stringify(catalog));
  } catch {}
}

function generateId(): string {
  return crypto.randomUUID();
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
        !record.author.toLowerCase().includes(q) &&
        !record.slug.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (filters.genre && !record.genres.includes(filters.genre)) return false;
    if (filters.status !== 'all' && record.status !== filters.status) return false;
    if (filters.author && record.author !== filters.author) return false;
    return true;
  });
}

export function loadComicRecord(id: string): ComicCmsRecord | null {
  return readCatalog().find((r) => r.id === id) ?? null;
}

export function loadComicDraft(key: string): ComicCmsFormValues | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${COMIC_CMS_DRAFT_PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as ComicCmsFormValues) : null;
  } catch {
    return null;
  }
}

export function saveComicDraft(key: string, data: ComicCmsFormValues): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${COMIC_CMS_DRAFT_PREFIX}${key}`, JSON.stringify(data));
  } catch {}
}

export function clearComicDraft(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${COMIC_CMS_DRAFT_PREFIX}${id}`);
  } catch {}
}

export function listComicModerationState(): ComicModerationState {
  if (typeof window === 'undefined') {
    return { keywords: ['spoiler', 'pirated', 'leak'], reportedComments: [] };
  }
  try {
    const raw = localStorage.getItem(COMIC_CMS_MODERATION_KEY);
    return raw ? (JSON.parse(raw) as ComicModerationState) : { keywords: ['spoiler', 'pirated', 'leak'], reportedComments: [] };
  } catch {
    return { keywords: ['spoiler', 'pirated', 'leak'], reportedComments: [] };
  }
}

export function saveComicModerationState(state: ComicModerationState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COMIC_CMS_MODERATION_KEY, JSON.stringify(state));
  } catch {}
}

export function proxiedR2ImageUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('r2') || parsed.hostname.includes('cloudflare')) {
      const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8787';
      return `${gateway}/api/admin/r2?url=${encodeURIComponent(url)}`;
    }
  } catch {}
  return url;
}

export function sortFilesByFilename(files: File[]): File[] {
  return [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || 'comic'
  );
}

function buildRecordFromForm(
  id: string,
  storyId: string,
  form: ComicCmsFormValues & { coverFile?: File | null },
  existing?: Partial<ComicCmsRecord>,
): ComicCmsRecord {
  return {
    id,
    slug: slugify(form.title),
    storyId,
    title: form.title,
    author: form.author,
    artist: form.artist || '',
    translator: form.translator || '',
    source: form.source || '',
    description: form.description || '',
    status: form.status,
    scheduledAt: form.scheduledAt ?? null,
    genres: form.genres ?? [],
    tags: form.tags ?? [],
    rankScore: form.rankScore ?? 0,
    coverUrl: form.coverUrl || '',
    viewCount: existing?.viewCount ?? 0,
    lastUpdatedAt: new Date().toISOString(),
    chapters: existing?.chapters ?? [],
  };
}

export async function createComicFromMetadata(
  input: ComicCmsFormValues & { coverFile?: File | null },
): Promise<ComicCmsRecord> {
  const id = generateId();
  const storyId = generateId();
  const record = buildRecordFromForm(id, storyId, input);

  try {
    const result = await apiClient.post<any>('/api/admin/comics', {
      slug: record.slug,
      title: record.title,
      author: record.author,
      description: record.description,
      status: record.status,
      genres: record.genres,
      tags: record.tags,
    });
    const created = Array.isArray(result) ? result[0] : result;
    const catalog = readCatalog();
    catalog.unshift(created);
    writeCatalog(catalog);
    return created;
  } catch {
    const catalog = readCatalog();
    catalog.unshift(record);
    writeCatalog(catalog);
    return record;
  }
}

export async function updateComicRecord(record: ComicCmsRecord): Promise<ComicCmsRecord> {
  const result = await apiClient.patch<any>(`/api/admin/comics/${record.id}`, {
    title: record.title,
    author: record.author,
    description: record.description,
    status: record.status,
    genres: record.genres,
    tags: record.tags,
    coverUrl: record.coverUrl,
    lastUpdatedAt: record.lastUpdatedAt,
  });
  const updated = Array.isArray(result) ? result[0] : result;
  const catalog = readCatalog();
  const index = catalog.findIndex((r) => r.id === record.id);
  if (index !== -1) catalog[index] = updated;
  else catalog.unshift(updated);
  writeCatalog(catalog);
  return updated;
}

export async function deleteComic(record: ComicCmsRecord): Promise<void> {
  await apiClient.delete(`/api/admin/comics/${record.id}`);
  const catalog = readCatalog();
  writeCatalog(catalog.filter((r) => r.id !== record.id));
}

export async function createComicChapterFromFiles(
  comic: ComicCmsRecord,
  chapterData: ComicChapterFormValues,
  files: File[],
): Promise<ComicCmsChapterRecord> {
  const chapterId = generateId();
  let imageUrls: string[];
  try {
    imageUrls = await uploadChapterImages(files);
  } catch {
    imageUrls = files.map((_, i) =>
      `https://placehold.co/600x800?text=chapter+${chapterData.chapterNumber}+page+${i + 1}+${Date.now()}`,
    );
  }

  const chapter: ComicCmsChapterRecord = {
    id: chapterId,
    chapterNumber: chapterData.chapterNumber,
    title: chapterData.title || `Chapter ${chapterData.chapterNumber}`,
    status: chapterData.status,
    scheduledAt: chapterData.scheduledAt ?? null,
    updatedAt: new Date().toISOString(),
    pages: imageUrls.map((url, i) => ({
      id: generateId(),
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
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        pageUrls: imageUrls,
      },
    );
    const row = Array.isArray(raw) ? raw[0] : raw;
    const created: ComicCmsChapterRecord = {
      id: row.id || chapter.id,
      chapterNumber: row.chapter_number ?? chapter.chapterNumber,
      title: row.title || chapter.title,
      status: chapter.status,
      scheduledAt: chapter.scheduledAt,
      updatedAt: row.updated_at || new Date().toISOString(),
      pages: (() => {
        try {
          const urls = JSON.parse(row.content || '[]');
          return Array.isArray(urls) ? urls.map((url: string) => ({
            id: generateId(),
            assetUrl: url,
            previewUrl: url,
            fileName: url.split('/').pop() || 'page',
          })) : chapter.pages;
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
  } catch {
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
  } catch {}
}

export async function requestComicCachePurge(_params: {
  comicId: string;
  chapterId?: string;
  assetKeys: string[];
}): Promise<void> {
  // CF cache purge requires zone ID + API token — not configured yet
}
