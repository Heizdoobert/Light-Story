import { HttpClient } from '../client';
import {
  ComicItem,
  ComicDetail,
  ChapterDetail,
  ComicListParams,
  RequestOptions,
} from '../types';

export class ComicsClient {
  constructor(private http: HttpClient) {}

  /**
   * List comics with query parameters.
   */
  public async list(
    params?: ComicListParams,
    options?: RequestOptions,
  ): Promise<ComicItem[]> {
    return this.http.get<ComicItem[]>('/api/comics', {
      ...options,
      params: {
        ...(params as Record<string, string | number | undefined>),
        ...(options?.params || {}),
      },
    });
  }

  /**
   * Get personalized or popular comic recommendations.
   */
  public async getRecommendations(options?: RequestOptions): Promise<ComicItem[]> {
    return this.http.get<ComicItem[]>('/api/comics/recommendations', options);
  }

  /**
   * Get detailed information for a specific comic by ID or slug.
   */
  public async getById(idOrSlug: string, options?: RequestOptions): Promise<ComicDetail> {
    return this.http.get<ComicDetail>(`/api/comics/${encodeURIComponent(idOrSlug)}`, options);
  }

  /**
   * Get chapters for a comic.
   */
  public async getChapters(comicId: string, options?: RequestOptions): Promise<ChapterDetail[]> {
    return this.http.get<ChapterDetail[]>(`/api/comics/${encodeURIComponent(comicId)}/chapters`, options);
  }

  /**
   * Get a specific chapter and its page assets.
   */
  public async getChapter(
    comicId: string,
    chapterNumber: number | string,
    options?: RequestOptions,
  ): Promise<ChapterDetail> {
    return this.http.get<ChapterDetail>(
      `/api/comics/${encodeURIComponent(comicId)}/chapters/${chapterNumber}`,
      options,
    );
  }

  /**
   * Create a new comic entry.
   */
  public async create(comicData: Partial<ComicDetail>, options?: RequestOptions): Promise<ComicDetail> {
    return this.http.post<ComicDetail>('/api/comics', comicData, options);
  }

  /**
   * Update an existing comic entry.
   */
  public async update(
    comicId: string,
    updates: Partial<ComicDetail>,
    options?: RequestOptions,
  ): Promise<ComicDetail> {
    return this.http.put<ComicDetail>(`/api/comics/${encodeURIComponent(comicId)}`, updates, options);
  }

  /**
   * Delete a comic entry.
   */
  public async delete(comicId: string, options?: RequestOptions): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`/api/comics/${encodeURIComponent(comicId)}`, options);
  }
}
