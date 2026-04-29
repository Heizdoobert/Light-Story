import { DashboardTabVisibility, SidebarMenuVisibility } from '@/lib/systemSettings';
import { Story, Chapter, Category } from '@/types/entities';

// ============================================
// Site Settings & System Configuration
// ============================================

export type SiteSettingDto = {
  key: string;
  value: unknown;
};

export type SystemSettingsSnapshotDto = {
  compactMode: boolean;
  showSyncBadge: boolean;
  dashboardTabVisibility: DashboardTabVisibility;
  sidebarMenuVisibility: SidebarMenuVisibility;
};

// ============================================
// API Response Envelopes
// ============================================

export type ApiSuccessResponse<T> = {
  data?: T;
  ok?: boolean;
  items?: T[];
  total?: number;
  count?: number;
  error?: never;
};

export type ApiErrorResponse = {
  error: string;
  data?: never;
  ok?: never;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================
// Story DTOs
// ============================================

export type StoryListRequest = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: 'all' | Story['status'];
  sort?: 'newest' | 'oldest' | 'most_viewed';
};

export type StoryListResponse = {
  items: Story[];
  total: number;
};

export type StoryDetailResponse = Story | null;

export type StoryCreateUpdateRequest = {
  title?: string;
  description?: string;
  author_id?: string;
  author?: string;
  category_id?: string;
  category?: string;
  cover_url?: string;
  status?: Story['status'];
};

export type StoryManageRequest = {
  action?: 'create' | 'update' | 'delete' | 'bulkUpdateStatus' | 'bulkDelete';
  story?: Partial<Story>;
  id?: string;
  ids?: string[];
  payload?: Partial<Story>;
  status?: Story['status'];
};

// ============================================
// Chapter DTOs
// ============================================

export type ChapterListRequest = {
  storyId?: string;
};

export type ChapterDetailResponse = Chapter | null;

export type ChapterCreateUpdateRequest = {
  story_id?: string;
  chapter_number?: number;
  title?: string;
  content?: string;
};

export type ChapterManageRequest = {
  action?: 'create' | 'update' | 'delete';
  chapter?: Partial<Chapter>;
  id?: string;
};

// ============================================
// Taxonomy (Categories & Authors) DTOs
// ============================================

export type CategoryDto = Category;

export type TaxonomyCreateRequest = {
  name: string;
  description?: string | null;
};

export type TaxonomyUpdateRequest = {
  name: string;
  description?: string | null;
};

export type TaxonomyManageRequest = {
  entity: 'category' | 'author';
  action: 'create' | 'update' | 'delete';
  id?: string;
  payload?: TaxonomyCreateRequest | TaxonomyUpdateRequest;
};

// ============================================
// Admin Profile & Audit DTOs
// ============================================

export type AdminProfileDto = {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
};

export type AdminProfileListResponse = {
  data: AdminProfileDto[];
};

export type AdminProfileUpdateRequest = {
  action: 'updateRole' | 'updateName';
  id: string;
  role?: string;
  full_name?: string | null;
};

export type AdminAuditLogDto = {
  id: string;
  actor_user_id: string;
  action: string;
  target_user_id?: string;
  target_email?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type AdminAuditLogListResponse = {
  data: AdminAuditLogDto[];
};

export type AdminAuditLogCreateRequest = {
  actor_user_id: string;
  action: string;
  target_user_id?: string;
  target_email?: string;
  metadata?: Record<string, unknown>;
};

// ============================================
// RPC Request DTOs
// ============================================

export type RpcIncrementViewsRequest = {
  storyId: string;
};

export type RpcLikeStoryRequest = {
  storyId: string;
};

export type RpcUnlikeStoryRequest = {
  storyId: string;
};

// ============================================
// Metrics DTOs
// ============================================

export type SiteMetricsResponse = {
  count: number;
};

export type RoleDistributionItem = {
  role: string;
  total: number;
};

export type RoleDistributionResponse = {
  data: RoleDistributionItem[];
};

// ============================================
// Auth DTOs
// ============================================

export type VerifyRecoveryRequest = {
  token: string;
};

export type VerifyRecoveryResponse = {
  valid: boolean;
  email?: string;
};

