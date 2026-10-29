import { HttpClient } from '../../client';
import { RequestOptions } from '../../types';

export interface ChapterItem {
  id: string;
  story_id?: string;
  storyId?: string;
  comic_id?: string;
  comicId?: string;
  chapter_number?: number;
  chapterNumber?: number;
  title?: string;
  content?: string;
  word_count?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface ChapterNavigationResolution {
  current: ChapterItem | null;
  previous: ChapterItem | null;
  next: ChapterItem | null;
  all: ChapterItem[];
  currentIndex: number;
  totalChapters: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface ParsedChapterPages {
  imageUrls: string[];
  isCbz: boolean;
  cbzUrl: string | null;
}

function isCbzUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().split('?')[0].toLowerCase();
  return clean.endsWith('.cbz') || clean.endsWith('.zip') || clean.endsWith('.cbr');
}

export class ChaptersClient {
  constructor(private http: HttpClient) {}

  /**
   * List all chapters for a given story/comic.
   */
  public async listByStory(storyId: string, options?: RequestOptions): Promise<ChapterItem[]> {
    const raw = await this.http.get<unknown>('/api/chapters', {
      ...options,
      params: {
        storyId,
        ...(options?.params || {}),
      },
    });

    if (Array.isArray(raw)) {
      return raw as ChapterItem[];
    }
    const rawObj = raw as { items?: ChapterItem[] } | null;
    if (rawObj && Array.isArray(rawObj.items)) {
      return rawObj.items;
    }
    return [];
  }

  /**
   * Get chapter detail by ID.
   */
  public async getById(chapterId: string, options?: RequestOptions): Promise<ChapterItem> {
    return this.http.get<ChapterItem>(
      `/api/chapters/${encodeURIComponent(chapterId)}`,
      options,
    );
  }

  /**
   * Batch fetch latest chapters for multiple comic IDs.
   */
  public async getBatchLatest(
    comicIds: string[],
    options?: RequestOptions,
  ): Promise<ChapterItem[]> {
    if (!comicIds || comicIds.length === 0) {
      return [];
    }

    const raw = await this.http.get<unknown>('/api/comics/chapters/batch', {
      ...options,
      params: {
        comicIds: comicIds.join(','),
        ...(options?.params || {}),
      },
    });

    if (Array.isArray(raw)) {
      return raw as ChapterItem[];
    }
    if (raw && typeof raw === 'object') {
      return Object.values(raw as Record<string, ChapterItem>);
    }
    return [];
  }

  /**
   * Create a new chapter for a comic/story.
   */
  public async create(
    comicId: string,
    data: { chapterNumber: number; title: string; content: string },
    options?: RequestOptions,
  ): Promise<ChapterItem> {
    return this.http.post<ChapterItem>(
      `/api/comics/${encodeURIComponent(comicId)}/chapters`,
      {
        ...data,
        storyId: comicId,
      },
      options,
    );
  }

  /**
   * Update an existing chapter by ID.
   */
  public async update(
    chapterId: string,
    updates: Partial<ChapterItem>,
    options?: RequestOptions,
  ): Promise<ChapterItem> {
    return this.http.put<ChapterItem>(
      `/api/chapters/${encodeURIComponent(chapterId)}`,
      updates,
      options,
    );
  }

  /**
   * Delete a chapter by ID.
   */
  public async delete(
    chapterId: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `/api/chapters/${encodeURIComponent(chapterId)}`,
      options,
    );
  }

  /**
   * Pure algorithmic navigation resolution (current, previous, next, boundary checks).
   * Safe for client-side execution with zero network latency.
   */
  public resolveNavigation(
    chapters: ChapterItem[],
    currentChapterId: string,
  ): ChapterNavigationResolution {
    const sorted = [...chapters].sort((a, b) => {
      const numA = a.chapterNumber ?? a.chapter_number ?? 0;
      const numB = b.chapterNumber ?? b.chapter_number ?? 0;
      if (numA !== numB) {
        return numA - numB;
      }
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateA - dateB;
    });

    const currentIndex = sorted.findIndex((c) => c.id === currentChapterId);
    const current = currentIndex >= 0 ? sorted[currentIndex] : null;
    const previous = currentIndex > 0 ? sorted[currentIndex - 1] : null;
    const next =
      currentIndex >= 0 && currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;

    return {
      current,
      previous,
      next,
      all: sorted,
      currentIndex,
      totalChapters: sorted.length,
      hasPrevious: previous !== null,
      hasNext: next !== null,
    };
  }

  /**
   * Parses chapter content into structured page URLs and detects CBZ archives.
   */
  public parseChapterPages(content: unknown): ParsedChapterPages {
    let imageUrls: string[] = [];

    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          imageUrls = parsed.map((item) =>
            typeof item === 'string' ? item.trim() : String(item).trim(),
          );
        } else if (parsed && typeof parsed === 'object') {
          const pages =
            (parsed as Record<string, unknown>).pages ||
            (parsed as Record<string, unknown>).images ||
            (parsed as Record<string, unknown>).imageUrls;
          if (Array.isArray(pages)) {
            imageUrls = pages.map((item) =>
              typeof item === 'string' ? item.trim() : String(item).trim(),
            );
          } else {
            imageUrls = content.split(',').map((s) => s.trim());
          }
        } else {
          imageUrls = content.split(',').map((s) => s.trim());
        }
      } catch {
        imageUrls = content.split(',').map((s) => s.trim());
      }
    } else if (Array.isArray(content)) {
      imageUrls = content.map((item) =>
        typeof item === 'string' ? item.trim() : String(item).trim(),
      );
    }

    const cleanUrls = imageUrls.filter(
      (u): u is string => typeof u === 'string' && u.length > 0,
    );
    const cbzFromList = cleanUrls.find(isCbzUrl) ?? null;
    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    const bareCbz = trimmedContent && isCbzUrl(trimmedContent) ? trimmedContent : null;
    const cbzUrl = cbzFromList ?? bareCbz;

    return {
      imageUrls: cleanUrls,
      isCbz: cbzUrl !== null,
      cbzUrl,
    };
  }
}
