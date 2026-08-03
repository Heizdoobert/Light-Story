/**
 * Comprehensive System API Configuration
 * Centralized registry for all REST API endpoints & gateway URLs across the application.
 */

export const API_ENDPOINTS = {
  // Base Gateway URLs
  gateway: {
    base: process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8787',
    production: process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION || 'https://kv-worker.hhhuygiau.workers.dev',
    mock: 'http://localhost:4010',
  },

  // Auth APIs
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    resetPassword: '/api/auth/reset-password',
    refreshToken: '/api/auth/refresh',
  },

  // Admin Management APIs
  admin: {
    dashboardMetrics: '/api/admin/metrics',
    comics: '/api/admin/comics',
    comicDetail: (comicId: string) => `/api/admin/comics/${comicId}`,
    chapters: '/api/admin/chapter',
    stories: '/api/admin/stories',
    users: '/api/admin/users',
    userDetail: (userId: string) => `/api/admin/users/${userId}`,
    ads: '/api/admin/ads',
    ops: '/api/admin/ops',
    auditLogs: '/api/admin/audit-logs',
    accessLogs: '/api/admin/access-logs',
    systemSettings: '/api/admin/settings',
    categories: '/api/admin/categories',
    authors: '/api/admin/authors',
  },

  // User & Reader APIs
  user: {
    profile: '/api/user/profile',
    updateProfile: '/api/user/profile',
    bookmarks: '/api/user/bookmarks',
    toggleBookmark: '/api/user/bookmarks/toggle',
    readingHistory: '/api/user/history',
    updateHistory: '/api/user/history',
  },

  // Public Content APIs (Comics & Stories)
  content: {
    comicsList: '/api/comics',
    comicDetail: (comicId: string) => `/api/comics/${comicId}`,
    chaptersList: (comicId: string) => `/api/comics/${comicId}/chapters`,
    chapterDetail: (comicId: string, chapterId: string) => `/api/comics/${comicId}/chapters/${chapterId}`,
    storiesList: '/api/stories',
    storyDetail: (storyId: string) => `/api/story/${storyId}`,
    storyChapter: (storyId: string, chapterId: string) => `/api/story/${storyId}/chapter/${chapterId}`,
    search: '/api/search',
    categories: '/api/categories',
    authors: '/api/authors',
    trends: '/api/trends',
  },

  // System & Utility APIs
  system: {
    health: '/api/health',
    avatar: '/api/avatar',
    adsPolicy: '/api/ads/policy',
    adsServe: '/api/ads/serve',
  },
} as const;

export type ApiEndpoints = typeof API_ENDPOINTS;
export default API_ENDPOINTS;
