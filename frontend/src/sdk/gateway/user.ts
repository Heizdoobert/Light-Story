import { GatewayHttpClient } from './client';
import {
  BookmarkItem,
  ReadingHistoryItem,
  RequestOptions,
} from './types';

export class UserClient {
  constructor(private http: GatewayHttpClient) {}

  /**
   * Toggle bookmark for a comic.
   */
  public async toggleBookmark(
    comicId: string,
    options?: RequestOptions,
  ): Promise<{ bookmarked: boolean }> {
    return this.http.post<{ bookmarked: boolean }>(
      '/api/user/bookmarks/toggle',
      { comicId },
      options,
    );
  }

  /**
   * Save or update reading history progress.
   */
  public async saveHistory(
    data: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.http.post<{ success: boolean }>('/api/user/history', data, options);
  }

  /**
   * Get user bookmarks.
   */
  public async getBookmarks(
    pageSize: number = 50,
    options?: RequestOptions,
  ): Promise<BookmarkItem[]> {
    return this.http.get<BookmarkItem[]>('/api/user/bookmarks', {
      ...options,
      params: {
        pageSize,
        ...(options?.params || {}),
      },
    });
  }

  /**
   * Add a comic to user bookmarks.
   */
  public async addBookmark(
    comicId: string,
    options?: RequestOptions,
  ): Promise<{ bookmarked: boolean }> {
    return this.http.post<{ bookmarked: boolean }>(
      '/api/user/bookmarks/add',
      { comicId },
      options,
    );
  }

  /**
   * Remove a comic from user bookmarks.
   */
  public async removeBookmark(
    comicId: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `/api/user/bookmarks/${encodeURIComponent(comicId)}`,
      options,
    );
  }

  /**
   * Get user reading history.
   */
  public async getHistory(options?: RequestOptions): Promise<ReadingHistoryItem[]> {
    return this.http.get<ReadingHistoryItem[]>('/api/user/history', options);
  }

  /**
   * Record or update user reading history progress (alias for saveHistory).
   */
  public async recordHistory(
    data: { comicId: string; chapterId: string; lastPage?: number },
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.saveHistory(data, options);
  }
}
