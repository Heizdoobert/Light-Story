/**
 * Type definitions for Cloudflare Worker Gateway SDK.
 */

export interface GatewayConfig {
  /**
   * Custom base URL for the Gateway.
   * If omitted, resolves using ADR-001 getGatewayUrl().
   */
  baseUrl?: string;

  /**
   * Static access token or dynamic token getter function.
   * (Supports both getAuthToken and getAccessToken for backward/forward compatibility).
   */
  getAuthToken?: () => Promise<string | null> | string | null;
  getAccessToken?: () => Promise<string | null> | string | null;

  /**
   * Custom fetch implementation (useful for tests or mocking).
   */
  fetch?: typeof fetch;

  /**
   * Optional custom default headers.
   */
  defaultHeaders?: Record<string, string>;
}

export interface RequestOptions extends RequestInit {
  /**
   * Query parameters to append to the endpoint URL.
   */
  params?: Record<string, string | number | boolean | undefined | null>;

  /**
   * Explicit token override for this specific request.
   */
  token?: string | null;

  /**
   * Bypass prefix prepending if true.
   */
  rawPath?: boolean;
}

export interface GatewayApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  timestamp?: string;
}

// Health Types
export interface HealthStatus {
  status: 'ok' | string;
  worker: string;
  timestamp: string;
}

// R2 Types
export interface R2UploadOptions extends RequestOptions {
  key?: string;
  filename?: string;
  folder?: string;
  comicId?: string;
  chapterNumber?: number;
  pageNumber?: number;
}

export interface R2UploadResponse {
  key: string;
  url: string;
  size?: number;
  contentType?: string;
  [key: string]: unknown;
}

export interface R2SignedUrlResponse {
  signedUrl: string;
  expires?: number;
  [key: string]: unknown;
}

export interface R2ObjectItem {
  key: string;
  size: number;
  uploaded: string;
  httpEtag?: string;
}

export interface R2ListResponse {
  objects: R2ObjectItem[];
  truncated?: boolean;
  cursor?: string;
  [key: string]: unknown;
}

// Comics Types
export interface ComicListParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  keyword?: string;
  search?: string;
  category?: string;
  status?: string;
  sort?: string;
}

export interface ComicItem {
  id: string;
  title: string;
  slug?: string;
  cover_url?: string;
  author?: string;
  status?: string;
  views?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface ComicDetail extends ComicItem {
  description?: string;
  categories?: Array<{ id: string; name: string; slug: string }>;
  chapters?: Array<{ id: string; chapter_number: number; title?: string; created_at?: string }>;
}

export interface ChapterDetail {
  id: string;
  comic_id: string;
  chapter_number: number;
  title?: string;
  pages?: Array<{ page_number: number; image_url: string }>;
  created_at?: string;
}

// Stories & Category Types
export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface StoryItem {
  id: string;
  title: string;
  slug?: string;
  author?: string;
  content?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

// User Types
export interface BookmarkItem {
  comic_id: string;
  created_at?: string;
  comic?: ComicItem;
}

export interface ReadingHistoryItem {
  comic_id: string;
  chapter_id?: string;
  progress?: number;
  last_page?: number;
  updated_at?: string;
  comic?: ComicItem;
}

// Analytics Types
export interface AnalyticsOverview {
  totalStories?: number;
  totalViews?: number;
  uniqueVisitors?: number;
  recentChapters?: number;
  generatedAt?: string;
  [key: string]: unknown;
}

export interface EngagementSummary {
  activeUsers?: number;
  pageViews?: number;
  timeRange?: string;
  [key: string]: unknown;
}

export interface InfrastructureStats {
  storage?: {
    r2UsageBytes?: number;
    r2ObjectsCount?: number;
  };
  traffic?: {
    totalRequests?: number;
  };
  [key: string]: unknown;
}
