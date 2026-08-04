export const ROUTES = {
  HOME: "/",
  COMICS: "/comics",
  COMIC_DETAIL: (comicId: string) => `/comics/${comicId}`,
  CHAPTER_READER: (comicId: string, chapterId: string) =>
    `/comics/${comicId}/chapter/${chapterId}`,
  GENRE_DETAIL: (slug: string) => `/genres/${slug}`,

  // User Routes
  USER_DASHBOARD: "/dashboard",
  USER_HISTORY: "/history",
  USER_BOOKMARKS: "/bookmarks",
  USER_PROFILE: "/profile",

  // Admin Routes
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_COMICS: "/admin/comics",
  ADMIN_COMICS_NEW: "/admin/comics/new",
  ADMIN_COMIC_EDIT: (comicId: string) => `/admin/comics/${comicId}`,
  ADMIN_CHAPTERS: "/admin/chapters",
  ADMIN_CHAPTER_EDIT: (chapterId: string) => `/admin/chapters/${chapterId}`,
  ADMIN_USERS: "/admin/users",
  ADMIN_AUDIT: "/admin/audit",

  // Auth Routes
  LOGIN: "/login",
  REGISTER: "/register",
  RESET_PASSWORD: "/auth/reset-password",
} as const;
