import { apiClient } from "@/lib/api/apiClient";
import { ROUTES } from "@/lib/constants/routes";
import type { ComicStatus } from "@/lib/schemas/comic-cms-schemas";

const COMIC_CMS_CATALOG_KEY = "comic-cms:catalog";

export type PageAsset = {
  id: string;
  assetUrl?: string;
  previewUrl: string;
  fileName: string;
};

export type ComicCmsChapterRecord = {
  id: string;
  chapterNumber: number;
  title: string;
  pages: PageAsset[];
  updatedAt: string;
};

export type ComicCmsRecord = {
  id: string;
  title: string;
  author: string;
  description: string;
  status: ComicStatus;
  coverUrl: string;
  viewCount: number;
  lastUpdatedAt: string;
  chapters: ComicCmsChapterRecord[];
  category?: string[] | string;
  translator?: string;
  assignedTo?: string;
  created_by?: string;
};

function readCatalog(): ComicCmsRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMIC_CMS_CATALOG_KEY);
    return raw ? (JSON.parse(raw) as ComicCmsRecord[]) : [];
  } catch (err) {
    console.error("[comicCms] Failed to parse catalog", err);
    return [];
  }
}

function writeCatalog(catalog: ComicCmsRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMIC_CMS_CATALOG_KEY, JSON.stringify(catalog));
  } catch (err) {
    console.error("[comicCms] Failed to write catalog", err);
  }
}

export function proxiedR2ImageUrl(url: string): string {
  if (!url) return "";

  const lowerUrl = url.trim().toLowerCase();
  if (
    lowerUrl.startsWith("javascript:") ||
    lowerUrl.startsWith("vbscript:") ||
    lowerUrl.startsWith("data:")
  ) {
    return "";
  }

  const safeUrl = url.split("?")[0].split("#")[0];
  if (safeUrl.includes("../") || safeUrl.includes("..\\")) {
    return "";
  }

  const gateway =
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION || process.env.NEXT_PUBLIC_GATEWAY_URL
      : process.env.NEXT_PUBLIC_GATEWAY_URL;

  if (!gateway) return url;

  if (url.startsWith(ROUTES.API.ADMIN.R2_FILE_PREFIX)) {
    const key = url.slice(ROUTES.API.ADMIN.R2_FILE_PREFIX.length);
    return `${gateway}${ROUTES.API.MEDIA_PREFIX}${encodeURIComponent(key)}`;
  }

  if (url.startsWith(ROUTES.API.MEDIA_PREFIX)) {
    const path = url.slice(ROUTES.API.MEDIA_PREFIX.length);
    return `${gateway}${ROUTES.API.MEDIA_PREFIX}${encodeURIComponent(path)}`;
  }

  let hostname = "";
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    if (url.startsWith("/")) {
      return `${gateway}${ROUTES.API.MEDIA_PREFIX}${encodeURIComponent(url.slice(1))}`;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return `${gateway}${ROUTES.API.MEDIA_PREFIX}${encodeURIComponent(url)}`;
    }
    return url;
  }

  const isR2Host = hostname.endsWith(".r2.dev");
  const isCloudflareHost =
    hostname === "cloudflare.com" || hostname.endsWith(".cloudflare.com");

  if (isR2Host || isCloudflareHost) {
    return `${gateway}${ROUTES.API.ADMIN.R2_PROXY_QUERY(url)}`;
  }
  return url;
}

export async function deleteComic(id: string): Promise<void> {
  await apiClient.delete(ROUTES.API.ADMIN.COMIC(id));
  const catalog = readCatalog();
  writeCatalog(catalog.filter((r) => r.id !== id));
}

export async function createChapter(data: {
  story_id: string;
  title: string;
  chapter_number?: number;
  cover_url?: string;
}): Promise<{ id: string }> {
  const result = await apiClient.post<{ id: string } | { id: string }[]>(ROUTES.API.ADMIN.CHAPTERS, data);
  return Array.isArray(result) ? result[0] : result;
}
