export const ROUTES = {
  HOME: "/",
  COMICS: "/comics",
  SEARCH: "/search",
  COMIC_DETAIL: (id: string) => `/comics/${id}`,
  CHAPTER_READER: (comicId: string, chapterId: string) =>
    `/comics/${comicId}/chapter/${chapterId}`,
  USER: {
    PROFILE: "/user/profile",
    DASHBOARD: "/user/dashboard",
    FAVORITES: "/user/favorites",
    HISTORY: "/user/history",
  },
  ADMIN: {
    DASHBOARD: "/admin/dashboard",
    COMICS: "/admin/comics",
    CHAPTERS: "/admin/chapters",
    USERS: "/admin/users",
    CATEGORIES: "/admin/categories",
    AUTHORS: "/admin/authors",
    SETTINGS: "/admin/settings",
    ADS: "/admin/ads",
    AUDIT: "/admin/audit",
    OPERATIONS: "/admin/operations",
  },
  API: {
    HEALTH: "/api/health",
    ANALYTICS: "/api/analytics",
    CATEGORIES: "/api/categories",
  },
} as const;
