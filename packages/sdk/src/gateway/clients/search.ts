import { HttpClient } from '../../client';
import { ComicItem, StoryItem, RequestOptions } from '../../types';

export interface SearchFilterParams {
  keyword?: string;
  category?: string | string[];
  tag?: string | string[];
  tags?: string | string[];
  status?: 'draft' | 'published' | 'ongoing' | 'completed' | 'archived' | string;
  sort?: 'newest' | 'oldest' | 'popular' | 'most_viewed' | 'alphabet' | 'newest_update' | string;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface SearchPageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export class SearchClient {
  constructor(private http: HttpClient) {}

  /**
   * Search text stories with keyword, categories, tags, status, sorting, and pagination.
   */
  public async searchStories(
    params?: SearchFilterParams,
    options?: RequestOptions,
  ): Promise<SearchPageResult<StoryItem>> {
    const page = Math.max(1, params?.page ?? 1);
    const pageSize = Math.max(1, params?.pageSize ?? params?.limit ?? 10);
    const queryParams: Record<string, string | number | undefined> = {
      page,
      pageSize,
      keyword: params?.keyword,
      sort: params?.sort,
      status: params?.status,
    };

    if (params?.category) {
      queryParams.category = Array.isArray(params.category)
        ? params.category.join(',')
        : params.category;
    }

    const tagParam = params?.tags ?? params?.tag;
    if (tagParam) {
      queryParams.tag = Array.isArray(tagParam) ? tagParam.join(',') : tagParam;
    }

    const raw = await this.http.get<unknown>('/api/stories', {
      ...options,
      params: {
        ...queryParams,
        ...(options?.params || {}),
      },
    });

    const rawObj = raw as { items?: StoryItem[]; total?: number } | StoryItem[] | null;
    const items: StoryItem[] = Array.isArray(rawObj)
      ? rawObj
      : Array.isArray(rawObj?.items)
        ? rawObj.items
        : [];
    const total =
      rawObj && !Array.isArray(rawObj) && typeof rawObj.total === 'number'
        ? rawObj.total
        : items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Search comics with keyword, categories, status, sorting, and pagination.
   */
  public async searchComics(
    params?: SearchFilterParams,
    options?: RequestOptions,
  ): Promise<SearchPageResult<ComicItem>> {
    const page = Math.max(1, params?.page ?? 1);
    const pageSize = Math.max(1, params?.pageSize ?? params?.limit ?? 10);
    const queryParams: Record<string, string | number | undefined> = {
      page,
      pageSize,
      limit: pageSize,
      keyword: params?.keyword,
      sort: params?.sort,
      status: params?.status,
    };

    if (params?.category) {
      queryParams.category = Array.isArray(params.category)
        ? params.category.join(',')
        : params.category;
    }

    const raw = await this.http.get<unknown>('/api/comics', {
      ...options,
      params: {
        ...queryParams,
        ...(options?.params || {}),
      },
    });

    const rawObj = raw as { items?: ComicItem[]; total?: number } | ComicItem[] | null;
    const items: ComicItem[] = Array.isArray(rawObj)
      ? rawObj
      : Array.isArray(rawObj?.items)
        ? rawObj.items
        : [];
    const total =
      rawObj && !Array.isArray(rawObj) && typeof rawObj.total === 'number'
        ? rawObj.total
        : items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Search unified across stories and comics concurrently.
   */
  public async searchAll(
    keyword: string,
    params?: Omit<SearchFilterParams, 'keyword'>,
    options?: RequestOptions,
  ): Promise<{ stories: SearchPageResult<StoryItem>; comics: SearchPageResult<ComicItem> }> {
    const [stories, comics] = await Promise.all([
      this.searchStories({ ...params, keyword }, options),
      this.searchComics({ ...params, keyword }, options),
    ]);
    return { stories, comics };
  }

  /**
   * Get search suggestions for a given keyword.
   * Calls /api/search/suggest if available, or extracts from searchStories as a resilient fallback.
   */
  public async suggest(
    keyword: string,
    limit: number = 5,
    options?: RequestOptions,
  ): Promise<{ suggestions: string[] }> {
    const trimmed = (keyword || '').trim();
    if (!trimmed) {
      return { suggestions: [] };
    }

    try {
      const res = await this.http.get<{ suggestions: string[] }>('/api/search/suggest', {
        ...options,
        params: {
          keyword: trimmed,
          limit,
          ...(options?.params || {}),
        },
      });
      if (res && Array.isArray(res.suggestions)) {
        return res;
      }
    } catch {
      // Resilient fallback: query stories
    }

    const storiesRes = await this.searchStories({ keyword: trimmed, pageSize: limit }, options);
    const suggestions = Array.from(
      new Set(storiesRes.items.map((s) => s.title).filter((t): t is string => Boolean(t))),
    ).slice(0, limit);

    return { suggestions };
  }
}
