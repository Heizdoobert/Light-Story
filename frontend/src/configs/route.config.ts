/**
 * Comprehensive System Routing Configuration
 * Centralized registry for all page routes & navigation paths across the application.
 */

export const APP_ROUTES = {
  // Global & Base Routes
  home: '/',
  dashboard: '/dashboard',
  notFound: '/not-found',

  // Authentication Routes
  auth: {
    login: '/login',
    register: '/register',
    resetPassword: '/auth/reset-password',
  },

  // Dashboard Apps Group
  apps: {
    email: '/apps/email',
    chat: '/apps/chat',
  },

  // Dashboard Pages Group
  pages: {
    accountSettings: '/pages/account-settings',
    faq: '/pages/faq',
    pricing: '/pages/pricing',
    profile: '/profile',
  },

  // Dashboard Forms Group
  forms: {
    layouts: '/forms/form-layouts',
    validation: '/forms/form-validation',
  },

  // Dashboard Tables & UI Components
  tables: '/tables',
  ui: {
    cards: '/ui/cards',
    buttons: '/ui/buttons',
  },

  // Reader & Content Routes
  comics: {
    list: '/search',
    create: '/comics/create',
    detail: (comicId: string) => `/comics/${comicId}`,
    addChapter: (comicId: string) => `/comics/${comicId}/add-chapter`,
    chapter: (comicId: string, chapterId: string) => `/comics/${comicId}/chapter/${chapterId}`,
  },

  stories: {
    detail: (storyId: string) => `/story/${storyId}`,
    chapter: (storyId: string, chapterId: string) => `/story/${storyId}/chapter/${chapterId}`,
  },

  search: '/search',

  // System & Legacy Admin Routes
  admin: {
    index: '/admin',
    dashboard: '/dashboard',
  },

  // Error & Exception Routes
  errors: {
    forbidden: '/forbidden',
    unauthorized: '/unauthorized',
    notFound: '/not-found',
    exception: (code: number | string) => `/handle-exception/${code}`,
    badRequest: '/handle-exception/400',
    unauthorizedEx: '/handle-exception/401',
    forbiddenEx: '/handle-exception/403',
    notFoundEx: '/handle-exception/404',
    serviceUnavailable: '/handle-exception/503',
  },
} as const;

export type AppRoutes = typeof APP_ROUTES;
export default APP_ROUTES;
