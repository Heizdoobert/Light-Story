export const CACHE_TAGS = {
  COMICS: "comics",
  COMIC_DETAIL: (id: string) => `comic-${id}`,
  CHAPTERS: (comicId: string) => `chapters-${comicId}`,
  GENRES: "genres",
  USERS: "users",
  AUDIT_LOGS: "audit-logs",
  SETTINGS: "settings",
} as const;
