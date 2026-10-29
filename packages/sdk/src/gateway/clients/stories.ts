import { HttpClient } from '../../client';
import { StoryItem, CategoryItem, RequestOptions } from '../../types';

export class StoriesClient {
  constructor(private http: HttpClient) {}

  /**
   * List categories across stories/comics.
   */
  public async getCategories(options?: RequestOptions): Promise<CategoryItem[]> {
    return this.http.get<CategoryItem[]>('/api/categories', options);
  }

  /**
   * Record a view event for a story.
   */
  public async recordView(storyId: string, options?: RequestOptions): Promise<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `/api/stories/${encodeURIComponent(storyId)}/view`,
      {},
      options,
    );
  }

  /**
   * List text stories with optional pagination and filters.
   */
  public async list(
    params?: { page?: number; limit?: number; keyword?: string },
    options?: RequestOptions,
  ): Promise<StoryItem[]> {
    return this.http.get<StoryItem[]>('/api/stories', {
      ...options,
      params: {
        ...(params as Record<string, string | number | undefined>),
        ...(options?.params || {}),
      },
    });
  }

  /**
   * Get story details by ID or slug.
   */
  public async getById(idOrSlug: string, options?: RequestOptions): Promise<StoryItem> {
    return this.http.get<StoryItem>(`/api/stories/${encodeURIComponent(idOrSlug)}`, options);
  }

  /**
   * Get a specific chapter of a story.
   */
  public async getChapter(
    storyId: string,
    chapterNumber: number | string,
    options?: RequestOptions,
  ): Promise<{ id: string; chapter_number: number; content: string; title?: string }> {
    return this.http.get(`/api/stories/${encodeURIComponent(storyId)}/chapters/${chapterNumber}`, options);
  }

  /**
   * Create a new story.
   */
  public async create(storyData: Partial<StoryItem>, options?: RequestOptions): Promise<StoryItem> {
    return this.http.post<StoryItem>('/api/stories', storyData, options);
  }

  /**
   * Update an existing story.
   */
  public async update(
    storyId: string,
    updates: Partial<StoryItem>,
    options?: RequestOptions,
  ): Promise<StoryItem> {
    return this.http.put<StoryItem>(`/api/stories/${encodeURIComponent(storyId)}`, updates, options);
  }

  /**
   * Delete a story.
   */
  public async delete(storyId: string, options?: RequestOptions): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`/api/stories/${encodeURIComponent(storyId)}`, options);
  }
}
