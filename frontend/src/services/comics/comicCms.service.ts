import { apiClient } from "@/lib/api/apiClient";
import type {
  ComicCmsFormValues,
  ComicStatus,
} from "@/lib/validation/comicCmsSchemas";
import { uploadComicCover } from "./comic.service";

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
};

export type ComicCatalogFilters = {
  search: string;
  status: string;
  author: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
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

export function loadComicCatalog(): ComicCmsRecord[] {
  return readCatalog();
}

export function loadComicCatalogFiltered(
  catalog: any[],
  filters: ComicCatalogFilters,
) {
  // 1. THỰC HIỆN LỌC DỮ LIỆU (Giữ nguyên như cũ)
  const filteredCatalog = catalog.filter((record) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !record.title?.toLowerCase().includes(q) &&
        !record.author?.toLowerCase().includes(q)
      )
        return false;
    }
    if (
      filters.status &&
      filters.status !== "all" &&
      record.status !== filters.status
    )
      return false;
    if (filters.author && record.author !== filters.author) return false;

    if (filters.category && filters.category !== "all") {
      let recordCategories: string[] = [];
      if (record.category) {
        if (Array.isArray(record.category)) {
          recordCategories = record.category;
        } else if (typeof record.category === "string") {
          try {
            recordCategories = JSON.parse(record.category);
          } catch {
            recordCategories = record.category
              .split(",")
              .map((c: string) => c.trim());
          }
        }
      }
      const hasCategory = recordCategories.some(
        (c) => c.toLowerCase() === filters.category!.toLowerCase(),
      );
      if (!hasCategory) return false;
    }
    return true;
  });

  const sortType = filters.sort || "newest";
  filteredCatalog.sort((a, b) => {
    const dateA = new Date(
      a.lastUpdatedAt || a.updatedAt || a.createdAt || a.created_at || 0,
    ).getTime();
    const dateB = new Date(
      b.lastUpdatedAt || b.updatedAt || b.createdAt || b.created_at || 0,
    ).getTime();
    const viewsA = a.viewCount || a.view_count || a.views || 0;
    const viewsB = b.viewCount || b.view_count || b.views || 0;

    if (sortType === "oldest") return dateA - dateB;
    if (sortType === "most_viewed") return viewsB - viewsA;
    return dateB - dateA;
  });

  // 3. THỰC HIỆN PHÂN TRANG (PAGINATION) - 👉 PHẦN MỚI THÊM VÀO
  const page = filters.page || 1;
  const limit = filters.limit || 10; // Mặc định là 10 truyện 1 trang

  // Tính toán tổng số
  const totalItems = filteredCatalog.length;
  const totalPages = Math.ceil(totalItems / limit);

  // Cắt mảng lấy đúng số lượng cho trang hiện tại
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = filteredCatalog.slice(startIndex, endIndex);

  // Trả về Object chứa cả dữ liệu và thông tin trang
  return {
    data: paginatedData,
    meta: {
      currentPage: page,
      limit: limit,
      totalItems: totalItems,
      totalPages: totalPages,
    },
  };
}

export function loadComicRecord(id: string): ComicCmsRecord | null {
  return readCatalog().find((r) => r.id === id) ?? null;
}

export async function fetchComicCatalog(): Promise<ComicCmsRecord[]> {
  try {
    const result = await apiClient.get<any[]>("/api/admin/comics?pageSize=100");
    const catalog: ComicCmsRecord[] = Array.isArray(result)
      ? result.map(mapDbRowToRecord)
      : [];
    writeCatalog(catalog);
    return catalog;
  } catch (err) {
    console.error("[comicCms] fetchComicCatalog failed", err);
    return [];
  }
}

function mapDbRowToRecord(row: any): ComicCmsRecord {
  const mappedChapters: ComicCmsChapterRecord[] = Array.isArray(row.chapters)
    ? row.chapters
        .sort((a: any, b: any) => (b.chapter_number ?? 0) - (a.chapter_number ?? 0))
        .map((ch: any) => ({
          id: ch.id,
          chapterNumber: ch.chapter_number ?? 1,
          title: ch.title || `Chapter ${ch.chapter_number ?? 1}`,
          updatedAt: ch.updated_at || new Date().toISOString(),
          pages: (() => {
            try {
              const urls = JSON.parse(ch.content || "[]");
              return Array.isArray(urls)
                ? urls.map((url: string) => ({
                    id: crypto.randomUUID(),
                    assetUrl: url,
                    previewUrl: url,
                    fileName: url.split("/").pop() || "page",
                  }))
                : [];
            } catch {
              return [];
            }
          })(),
        }))
    : [];

  return {
    id: row.id,
    title: row.title || "",
    author: row.author || "",
    description: row.description || "",
    status: (row.status || "draft") as ComicStatus,
    coverUrl: row.cover_url || "",
    viewCount: row.views ?? 0,
    lastUpdatedAt: row.updated_at || new Date().toISOString(),
    chapters: mappedChapters,
    category: row.category || [],
  };
}

export function saveComicDraft(key: string, data: ComicCmsFormValues): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`comic-cms:draft:${key}`, JSON.stringify(data));
  } catch (err) {
    console.error("[comicCms] Failed to save draft", err);
  }
}

export function loadComicDraft(key: string): ComicCmsFormValues | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`comic-cms:draft:${key}`);
    return raw ? (JSON.parse(raw) as ComicCmsFormValues) : null;
  } catch (err) {
    console.error("[comicCms] Failed to parse draft", err);
    return null;
  }
}

export function clearComicDraft(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`comic-cms:draft:${id}`);
  } catch (err) {
    console.error("[comicCms] Failed to clear draft", err);
  }
}

export function listComicModerationState() {
  if (typeof window === "undefined") {
    return { keywords: ["spoiler", "pirated", "leak"], reportedComments: [] };
  }
  try {
    const raw = localStorage.getItem("comic-cms:moderation");
    return raw
      ? JSON.parse(raw)
      : { keywords: ["spoiler", "pirated", "leak"], reportedComments: [] };
  } catch {
    return { keywords: ["spoiler", "pirated", "leak"], reportedComments: [] };
  }
}

export function saveComicModerationState(state: any): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("comic-cms:moderation", JSON.stringify(state));
  } catch (err) {
    console.error("[comicCms] Failed to save moderation state", err);
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
      ? process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION || process.env.NEXT_PUBLIC_GATEWAY_URL || "https://kv-worker.truyen3new.workers.dev"
      : process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8787";

  if (url.startsWith("/api/admin/r2/file/")) {
    const key = url.replace("/api/admin/r2/file/", "");
    return `${gateway}/api/media/${encodeURIComponent(key)}`;
  }

  if (url.startsWith("/api/media/")) {
    const path = url.slice("/api/media/".length);
    return `${gateway}/api/media/${encodeURIComponent(path)}`;
  }

  let hostname = "";
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    if (url.startsWith("/")) {
      return `${gateway}${encodeURI(url)}`;
    }
    return url;
  }

  const isR2Host = hostname.endsWith(".r2.dev");
  const isCloudflareHost =
    hostname === "cloudflare.com" || hostname.endsWith(".cloudflare.com");

  if (isR2Host || isCloudflareHost) {
    if (gateway) {
      return `${gateway}/api/admin/r2?url=${encodeURIComponent(url)}`;
    }
  }
  return url;
}

export function sortFilesByFilename(files: File[]): File[] {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
}

export async function createComicFromMetadata(
  input: ComicCmsFormValues & { coverFile?: File | null },
): Promise<ComicCmsRecord> {
  let coverUrl = input.coverUrl || "";
  if (input.coverFile) {
    coverUrl = await uploadComicCover(input.coverFile);
  }
  const result = await apiClient.post<any>("/api/admin/comics", {
    title: input.title,
    author: input.author || "Unknown",
    description: input.description || "",
    status: input.status || "draft",
    coverUrl: coverUrl || undefined,
  });
  const created = Array.isArray(result) ? result[0] : result;
  const record = mapDbRowToRecord(created);
  const catalog = readCatalog();
  catalog.unshift(record);
  writeCatalog(catalog);
  return record;
}

export async function updateComicRecord(
  record: ComicCmsRecord,
): Promise<ComicCmsRecord> {
  const result = await apiClient.patch<any>(`/api/admin/comics/${record.id}`, {
    title: record.title,
    author: record.author,
    description: record.description,
    status: record.status,
    coverUrl: record.coverUrl,
  });
  const updated = Array.isArray(result) ? result[0] : result;
  const mapped = mapDbRowToRecord(updated);
  const catalog = readCatalog();
  const index = catalog.findIndex((r) => r.id === record.id);
  if (index !== -1) catalog[index] = mapped;
  else catalog.unshift(mapped);
  writeCatalog(catalog);
  return mapped;
}

export async function deleteComic(id: string): Promise<void> {
  await apiClient.delete(`/api/admin/comics/${id}`);
  const catalog = readCatalog();
  writeCatalog(catalog.filter((r) => r.id !== id));
}

export async function deleteComicChapter(
  comicId: string,
  chapterId: string,
): Promise<void> {
  await apiClient.delete(`/api/admin/comics/${comicId}/chapters/${chapterId}`);
  const catalog = readCatalog();
  const comicIndex = catalog.findIndex((r) => r.id === comicId);
  if (comicIndex !== -1) {
    catalog[comicIndex].chapters = catalog[comicIndex].chapters.filter((ch) => ch.id !== chapterId);
    catalog[comicIndex].lastUpdatedAt = new Date().toISOString();
    writeCatalog(catalog);
  }
}

export async function recordComicAudit(
  action: string,
  metadata: Record<string, unknown>,
  entityType = "comic",
  entityId?: string,
): Promise<void> {
  try {
    await apiClient.post("/api/admin/audit", {
      action,
      metadata,
      entity_type: entityType,
      entity_id: entityId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[comicCms] recordComicAudit failed", err);
  }
}

export async function requestComicCachePurge(_params: {
  comicId: string;
  chapterId?: string;
  assetKeys: string[];
}): Promise<void> {
  // Cloudflare Cache Purge integration
}

export async function createChapter(data: {
  story_id: string;
  title: string;
  chapter_number?: number;
  cover_url?: string;
}): Promise<{ id: string }> {
  const result = await apiClient.post<any>("/api/admin/chapters", data);
  return Array.isArray(result) ? result[0] : result;
}

export async function getPresignedPutUrls(
  chapterId: string,
  files: { name: string }[],
): Promise<{ key: string; uploadUrl: string; publicUrl: string }[]> {
  const res = await apiClient.post<{ urls: any[] }>("/api/admin/r2/presigned-urls", {
    chapterId,
    files,
  });
  return res.urls ?? [];
}

export async function uploadFileToPresignedUrl(url: string, file: File, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

export async function updateChapterImages(
  chapterId: string,
  content: { src: string; alt?: string; caption?: string }[],
): Promise<void> {
  await apiClient.put(`/api/admin/chapters/${chapterId}/images`, { content });
}

export async function createChapterWithPresignedUpload(
  storyIdOrRecord: string | ComicCmsRecord,
  chapterData: { title: string; chapterNumber: number },
  files: File[],
): Promise<ComicCmsChapterRecord> {
  const storyId = typeof storyIdOrRecord === "string" ? storyIdOrRecord : storyIdOrRecord.id;
  const chapter = await createChapter({ story_id: storyId, title: chapterData.title, chapter_number: chapterData.chapterNumber });
  const urls = await getPresignedPutUrls(chapter.id, files.map((f) => ({ name: f.name })));
  await Promise.all(urls.map((u, i) => uploadFileToPresignedUrl(u.uploadUrl, files[i])));
  const content = urls.map((u) => ({ src: u.publicUrl, alt: u.key.split("/").pop() }));
  await updateChapterImages(chapter.id, content);
  return {
    id: chapter.id,
    chapterNumber: chapterData.chapterNumber,
    title: chapterData.title,
    pages: content.map((c, i) => ({
      id: crypto.randomUUID(),
      assetUrl: c.src,
      previewUrl: c.src,
      fileName: files[i]?.name ?? `page-${i + 1}.png`,
    })),
    updatedAt: new Date().toISOString(),
  };
}

export const createComicChapterFromFiles = createChapterWithPresignedUpload;

export async function uploadFilesToR2(
  files: File[],
  folder: "covers" | "chapters" | "avatars" | "uploads" = "uploads",
  metadata?: { comicId?: string; chapterNumber?: string | number; userId?: string }
): Promise<string[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("file", file));
  formData.append("folder", folder);
  if (metadata?.comicId) formData.append("comicId", metadata.comicId);
  if (metadata?.chapterNumber !== undefined && metadata?.chapterNumber !== null) {
    formData.append("chapterNumber", String(metadata.chapterNumber));
  }
  if (metadata?.userId) formData.append("userId", metadata.userId);

  const response = await apiClient.post<{ urls: string[] }>(
    "/api/admin/upload-to-r2",
    formData
  );
  return response.urls || [];
}

export async function getR2SignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const response = await apiClient.post<{ signedUrl: string }>(
    "/api/admin/r2/signed-url",
    { key, expiresInSeconds }
  );
  return response.signedUrl || "";
}

export async function listR2Objects(prefix = ""): Promise<{ key: string; size: number; uploaded: string }[]> {
  const response = await apiClient.get<{ objects: any[] }>(
    `/api/admin/r2/list?prefix=${encodeURIComponent(prefix)}`
  );
  return response.objects || [];
}

export async function cleanupR2Prefix(prefix: string): Promise<number> {
  const response = await apiClient.post<{ deletedCount: number }>(
    "/api/admin/r2/cleanup",
    { prefix }
  );
  return response.deletedCount || 0;
}
