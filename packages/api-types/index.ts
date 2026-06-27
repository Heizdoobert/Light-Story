/**
 * Unified API response envelope for all endpoints.
 * Used by api-gateway, domain workers, edge functions, and frontend.
 *
 * Also re-exports flattened component schemas from the OpenAPI spec
 * so consumers can import entity/DTO types ergonomically.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
  correlationId?: string;
}

export function successResponse<T>(data: T, correlationId?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    correlationId,
  };
}

export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, any>,
  correlationId?: string
): ApiResponse {
  return {
    success: false,
    error: { code, message, details },
    timestamp: new Date().toISOString(),
    correlationId,
  };
}

// ── Generated types (paths, operations, components) ───────
import type { components, operations, paths } from './src/generated/index';
export type { paths, operations };

// ── Flattened schema types ────────────────────────────────
export type ApiError = components['schemas']['ApiError'];

// Entities
export type Story = components['schemas']['Story'];
export type Chapter = components['schemas']['Chapter'];
export type Category = components['schemas']['Category'];
export type Author = components['schemas']['Author'];
export type SiteSetting = components['schemas']['SiteSetting'];

// Story DTOs
export type StoryListRequest = components['schemas']['StoryListRequest'];
export type StoryCreateUpdateRequest = components['schemas']['StoryCreateUpdateRequest'];
export type StoryManageRequest = components['schemas']['StoryManageRequest'];

// Chapter DTOs
export type ChapterListRequest = components['schemas']['ChapterListRequest'];
export type ChapterCreateUpdateRequest = components['schemas']['ChapterCreateUpdateRequest'];
export type ChapterManageRequest = components['schemas']['ChapterManageRequest'];

// Taxonomy DTOs
export type TaxonomyCreateRequest = components['schemas']['TaxonomyCreateRequest'];
export type TaxonomyUpdateRequest = components['schemas']['TaxonomyUpdateRequest'];
export type TaxonomyManageRequest = components['schemas']['TaxonomyManageRequest'];

// Admin DTOs
export type AdminProfileDto = components['schemas']['AdminProfileDto'];
export type AdminProfileUpdateRequest = components['schemas']['AdminProfileUpdateRequest'];
export type AdminAuditLogDto = components['schemas']['AdminAuditLogDto'];
export type AdminAuditLogCreateRequest = components['schemas']['AdminAuditLogCreateRequest'];

// RPC DTOs
export type RpcLikeStoryRequest = components['schemas']['RpcLikeStoryRequest'];
export type RpcUnlikeStoryRequest = components['schemas']['RpcUnlikeStoryRequest'];
export type RpcIncrementViewsRequest = components['schemas']['RpcIncrementViewsRequest'];

// Metrics DTOs
export type SiteMetricsResponse = components['schemas']['SiteMetricsResponse'];
export type RoleDistributionItem = components['schemas']['RoleDistributionItem'];
export type RoleDistributionResponse = components['schemas']['RoleDistributionResponse'];

// Auth DTOs
export type VerifyRecoveryRequest = components['schemas']['VerifyRecoveryRequest'];
export type VerifyRecoveryResponse = components['schemas']['VerifyRecoveryResponse'];

// Analytics types
export type AnalyticsDashboardResponse = components['schemas']['AnalyticsDashboardResponse'];
export type AnalyticsMeta = components['schemas']['AnalyticsMeta'];
export type UserEngagementMetrics = components['schemas']['UserEngagementMetrics'];
export type ContentPerformanceMetrics = components['schemas']['ContentPerformanceMetrics'];
export type InfrastructureMetrics = components['schemas']['InfrastructureMetrics'];
export type AnalyticsTrendPoint = components['schemas']['AnalyticsTrendPoint'];

// Wrapped response types
export type ApiResponse_Empty = components['schemas']['ApiResponse_Empty'];
export type ApiResponse_ErrorOnly = components['schemas']['ApiResponse_ErrorOnly'];
export type ApiResponse_Story = components['schemas']['ApiResponse_Story'];
export type ApiResponse_StoryListData = components['schemas']['ApiResponse_StoryListData'];
export type ApiResponse_Chapter = components['schemas']['ApiResponse_Chapter'];
export type ApiResponse_ChapterListData = components['schemas']['ApiResponse_ChapterListData'];
export type ApiResponse_CategoryList = components['schemas']['ApiResponse_CategoryList'];
export type ApiResponse_SiteMetrics = components['schemas']['ApiResponse_SiteMetrics'];
export type ApiResponse_RoleDistribution = components['schemas']['ApiResponse_RoleDistribution'];
export type ApiResponse_AdminProfileList = components['schemas']['ApiResponse_AdminProfileList'];
export type ApiResponse_AuditLogList = components['schemas']['ApiResponse_AuditLogList'];
export type ApiResponse_AnalyticsDashboard = components['schemas']['ApiResponse_AnalyticsDashboard'];
