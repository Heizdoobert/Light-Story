/**
 * Core type definitions for @light-story/sdk.
 */

export interface SdkLogger {
  debug?(message: string, ...args: unknown[]): void;
  info?(message: string, ...args: unknown[]): void;
  warn?(message: string, ...args: unknown[]): void;
  error?(message: string, ...args: unknown[]): void;
}

export interface RetryConfig {
  /** Maximum number of retry attempts. Default: 3. Set to 0 to disable retries. */
  maxRetries?: number;
  /** Base delay in milliseconds before exponential backoff. Default: 300ms. */
  backoffBaseMs?: number;
  /** Maximum backoff delay in milliseconds. Default: 5000ms. */
  maxDelayMs?: number;
  /** Status codes that trigger a retry. Default: [429, 502, 503, 504]. */
  retryStatusCodes?: number[];
  /** Safe HTTP methods eligible for auto-retries. Default: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']. */
  retryMethods?: string[];
}

export interface ClientConfig {
  /** Custom base URL for the Gateway (e.g. https://api.light-story.com or http://localhost:8787). */
  baseUrl?: string;

  /** Static or dynamic token getter function for authentication. */
  getAuthToken?: () => Promise<string | null> | string | null;
  getAccessToken?: () => Promise<string | null> | string | null;

  /** Custom fetch implementation (useful for tests or custom proxies). */
  fetch?: typeof fetch;

  /** Default headers applied to every request. */
  defaultHeaders?: Record<string, string>;

  /** Default timeout in milliseconds for requests. Default: 15000ms (15s). */
  timeoutMs?: number;

  /** Retry policy configuration or boolean to enable/disable. Default: enabled with standard defaults. */
  retry?: boolean | RetryConfig;

  /** Optional logger interface (info, warn, error, debug). Defaults to silent. */
  logger?: SdkLogger;
}

/** Backward compatibility alias */
export type GatewayConfig = ClientConfig;

export interface RequestOptions extends Omit<RequestInit, 'headers' | 'body'> {
  /** Request body (plain object, FormData, Blob, string, etc.). Plain objects will be automatically serialized to JSON. */
  body?: unknown;

  /** Custom request headers */
  headers?: HeadersInit;

  /** Query parameters to append to the endpoint URL. */
  params?: Record<string, string | number | boolean | undefined | null>;

  /** Explicit bearer token override for this specific request. */
  token?: string | null;

  /** Bypass endpoint prefixing if true. */
  rawPath?: boolean;

  /** Timeout in milliseconds for this specific request (overrides client default). */
  timeoutMs?: number;

  /**
   * Retry configuration for this specific request:
   * - boolean: enable/disable retries (e.g. set true on POST to opt into mutation retries)
   * - object: override maxRetries or retryStatusCodes
   */
  retry?: boolean | Partial<RetryConfig>;
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
