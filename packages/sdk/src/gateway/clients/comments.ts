import { HttpClient } from '../../client';
import { RequestOptions } from '../../types';

export interface CommentItem {
  id: string;
  story_id?: string;
  storyId?: string;
  author_id?: string;
  authorId?: string;
  parent_id?: string | null;
  parentId?: string | null;
  body: string;
  status?: 'visible' | 'hidden' | 'deleted' | 'flagged' | string;
  like_count?: number;
  likeCount?: number;
  liked_by_user?: boolean;
  likedByUser?: boolean;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  author?: {
    display_name?: string;
    avatar_url?: string;
  };
  replies?: CommentItem[];
  [key: string]: unknown;
}

export interface CommentListParams {
  storyId: string;
  parentId?: string | null;
  page?: number;
  pageSize?: number;
  limit?: number;
  sort?: 'newest' | 'popular' | 'oldest' | string;
}

export interface RatingItem {
  id: string;
  story_id?: string;
  storyId?: string;
  user_id?: string;
  userId?: string;
  rating: number; // 1 to 5
  review?: string | null;
  status?: 'visible' | 'hidden' | 'flagged' | string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface RatingSummary {
  storyId: string;
  averageRating: number;
  totalRatings: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export class CommentsClient {
  constructor(private http: HttpClient) {}

  /**
   * List comments for a given story, with pagination, sorting, and optional parentId filter.
   */
  public async listComments(
    params: CommentListParams,
    options?: RequestOptions,
  ): Promise<{ items: CommentItem[]; total: number }> {
    const raw = await this.http.get<unknown>(
      `/api/stories/${encodeURIComponent(params.storyId)}/comments`,
      {
        ...options,
        params: {
          parentId: params.parentId,
          page: params.page ?? 1,
          pageSize: params.pageSize ?? params.limit ?? 20,
          sort: params.sort,
          ...(options?.params || {}),
        },
      },
    );

    if (Array.isArray(raw)) {
      return { items: raw as CommentItem[], total: raw.length };
    }
    const rawObj = raw as { items?: CommentItem[]; total?: number } | null;
    const items: CommentItem[] = Array.isArray(rawObj?.items) ? rawObj.items : [];
    const total = typeof rawObj?.total === 'number' ? rawObj.total : items.length;
    return { items, total };
  }

  /**
   * Post a new comment or reply to an existing comment.
   */
  public async createComment(
    input: { storyId: string; body: string; parentId?: string | null },
    options?: RequestOptions,
  ): Promise<CommentItem> {
    return this.http.post<CommentItem>(
      `/api/stories/${encodeURIComponent(input.storyId)}/comments`,
      {
        body: input.body,
        parentId: input.parentId ?? null,
      },
      options,
    );
  }

  /**
   * Delete a comment by ID.
   */
  public async deleteComment(
    commentId: string,
    options?: RequestOptions,
  ): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `/api/comments/${encodeURIComponent(commentId)}`,
      options,
    );
  }

  /**
   * Toggle like state on a comment.
   */
  public async toggleLike(
    commentId: string,
    options?: RequestOptions,
  ): Promise<{ liked: boolean; likeCount: number }> {
    return this.http.post<{ liked: boolean; likeCount: number }>(
      `/api/comments/${encodeURIComponent(commentId)}/like`,
      {},
      options,
    );
  }

  /**
   * List ratings and reviews for a given story.
   */
  public async listRatings(
    storyId: string,
    params?: { page?: number; pageSize?: number },
    options?: RequestOptions,
  ): Promise<{ items: RatingItem[]; total: number }> {
    const raw = await this.http.get<unknown>(
      `/api/stories/${encodeURIComponent(storyId)}/ratings`,
      {
        ...options,
        params: {
          page: params?.page ?? 1,
          pageSize: params?.pageSize ?? 20,
          ...(options?.params || {}),
        },
      },
    );

    if (Array.isArray(raw)) {
      return { items: raw as RatingItem[], total: raw.length };
    }
    const rawObj = raw as { items?: RatingItem[]; total?: number } | null;
    const items: RatingItem[] = Array.isArray(rawObj?.items) ? rawObj.items : [];
    const total = typeof rawObj?.total === 'number' ? rawObj.total : items.length;
    return { items, total };
  }

  /**
   * Submit or update a rating and review for a story.
   */
  public async submitRating(
    input: { storyId: string; rating: number; review?: string },
    options?: RequestOptions,
  ): Promise<RatingItem> {
    return this.http.post<RatingItem>(
      `/api/stories/${encodeURIComponent(input.storyId)}/ratings`,
      {
        rating: input.rating,
        review: input.review,
      },
      options,
    );
  }

  /**
   * Calculate summary statistics (average, total, distribution) for a list of ratings.
   */
  public calculateRatingSummary(storyId: string, ratings: RatingItem[]): RatingSummary {
    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let sum = 0;
    let totalRatings = 0;
    const list = Array.isArray(ratings) ? ratings : [];

    for (const item of list) {
      if (item && typeof item === 'object') {
        const rawRating: unknown = (item as Record<string, unknown>).rating;
        if (
          rawRating !== null &&
          rawRating !== undefined &&
          typeof rawRating !== 'boolean' &&
          (typeof rawRating !== 'string' || rawRating.trim() !== '')
        ) {
          const rawVal = Number(rawRating);
          if (Number.isFinite(rawVal)) {
            const clamped = Math.min(5, Math.max(1, rawVal));
            const bucket = Math.round(clamped) as 1 | 2 | 3 | 4 | 5;
            distribution[bucket]++;
            sum += clamped;
            totalRatings++;
          }
        }
      }
    }

    const averageRating = totalRatings > 0 ? Number((sum / totalRatings).toFixed(2)) : 0;

    return {
      storyId,
      averageRating,
      totalRatings,
      distribution,
    };
  }
}
