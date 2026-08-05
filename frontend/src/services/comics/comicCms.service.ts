import { apiClient } from "@/lib/api/apiClient";
import { supabase } from "@/lib/supabase/client";
import type {
  ComicCmsFormValues,
  ComicStatus,
} from "@/lib/validation/comic-cms-schemas";
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

export function loadComicRecord(id: string): ComicCmsRecord | null {
  return readCatalog().find((r) => r.id === id) ?? null;
}

export async function fetchComicCatalog(): Promise<ComicCmsRecord[]> {
  try {
    const result = await apiClient.get<any>("/api/admin/comics?pageSize=100");
    const rawList = Array.isArray(result) ? result : result?.items || result?.comics || [];
    const catalog: ComicCmsRecord[] = rawList.map(mapDbRowToRecord);
    if (catalog.length > 0) {
      writeCatalog(catalog);
      return catalog;
    }
  } catch (err) {
    console.error("[comicCms] fetchComicCatalog failed", err);
  }

  if (supabase && process.env.NODE_ENV !== "test") {
    try {
      const { data } = await supabase
        .from("stories")
        .select("*, chapters(*)")
        .neq("status", "archived")
        .order("updated_at", { ascending: false });
      if (data && data.length > 0) {
        const catalog = data.map(mapDbRowToRecord);
        writeCatalog(catalog);
        return catalog;
      }
    } catch {}
  }
  return readCatalog();
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
      ? process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION || process.env.NEXT_PUBLIC_GATEWAY_URL || "https://kv-worker.hhhuygiau.workers.dev"
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
      return `${gateway}/api/media/${encodeURIComponent(url.slice(1))}`;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return `${gateway}/api/media/${encodeURIComponent(url)}`;
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

export async function createComicChapterFromFiles(
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
