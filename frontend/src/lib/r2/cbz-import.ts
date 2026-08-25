import JSZip from "jszip";
import { ROUTES } from "@/lib/constants/routes";
import { getGatewayUrl } from "@/lib/utils/gateway-url";
import { getAccessToken } from "@/services/comics/comic.service";

export const CBZ_LIMITS = {
  maxFileMB: 50,
  maxPages: 300,
  maxImageMB: 10,
  poolSize: 4,
  timeoutMs: 60_000,
  quotaDayWarn: 50_000,
  quotaMonthWarn: 500_000,
} as const;

export const CBZ_IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "avif", "gif"] as const;

export function parseChapterNumberFromFilename(name: string): number | null {
  const m = name.match(/\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function chapterTitleFromNumber(n: number): string {
  return `chapter ${n}`;
}

export interface CbzImage {
  name: string;
  ext: string;
  blob: Blob;
}

export class CbzImportError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

/** Unzip + filter + natural-sort pages. All caps enforced here, before any upload. */
export async function extractCbzImages(file: File): Promise<CbzImage[]> {
  if (file.size > CBZ_LIMITS.maxFileMB * 1024 * 1024) {
    throw new CbzImportError("TOO_LARGE", `File exceeds ${CBZ_LIMITS.maxFileMB}MB`);
  }
  let zip: JSZip;
  try {
    zip = await new JSZip().loadAsync(file);
  } catch {
    throw new CbzImportError("CORRUPT", "Corrupt or invalid .cbz archive");
  }

  const found: Array<{ path: string; ext: string; entry: JSZip.JSZipObject }> = [];
  zip.forEach((relativePath, entry) => {
    const fileName = relativePath.split("/").pop() || "";
    if (entry.dir || relativePath.includes("__MACOSX") || fileName.startsWith(".")) return;
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    if ((CBZ_IMAGE_EXTS as readonly string[]).includes(ext)) {
      found.push({ path: relativePath, ext, entry });
    }
  });

  if (found.length === 0) {
    throw new CbzImportError("EMPTY", "No valid images in archive");
  }
  if (found.length > CBZ_LIMITS.maxPages) {
    throw new CbzImportError("TOO_MANY_PAGES", `Exceeds ${CBZ_LIMITS.maxPages} pages per file`);
  }

  found.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: "base" }));

  const images: CbzImage[] = [];
  for (const { path, ext, entry } of found) {
    const blob = await entry.async("blob");
    if (blob.size > CBZ_LIMITS.maxImageMB * 1024 * 1024) {
      throw new CbzImportError("PAGE_TOO_LARGE", `Page ${path} exceeds ${CBZ_LIMITS.maxImageMB}MB`);
    }
    images.push({ name: path.split("/").pop() || path, ext, blob });
  }
  return images;
}

export async function fetchExistingChapterNumbers(comicId: string): Promise<Set<number>> {
  const token = await getAccessToken();
  const res = await fetch(`${getGatewayUrl()}/api/admin/comics/${comicId}/chapters`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as
    | { data?: Array<{ chapter_number?: number }> }
    | Array<{ chapter_number?: number }>;
  const rows = Array.isArray(body) ? body : (body.data ?? []);
  return new Set(rows.map((r) => Number(r.chapter_number)).filter((n) => Number.isFinite(n) && n > 0));
}

export async function uploadChapterPage(
  file: File,
  opts: { comicId: string; chapterNumber: number; pageNumber: number },
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", "chapters");
  form.append("comicId", opts.comicId);
  form.append("chapterNumber", String(opts.chapterNumber));
  form.append("pageNumber", String(opts.pageNumber));

  const token = await getAccessToken();
  const post = (signal: AbortSignal) =>
    fetch(`${getGatewayUrl()}${ROUTES.API.ADMIN.R2_UPLOAD_GATEWAY}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      signal,
    });

  let res: Response;
  try {
    res = await post(AbortSignal.timeout(CBZ_LIMITS.timeoutMs));
  } catch {
    // Network error or timeout — retry once; 4xx/5xx never retried (mirrors lib/r2/upload.ts)
    try {
      res = await post(AbortSignal.timeout(CBZ_LIMITS.timeoutMs));
    } catch {
      throw new Error("network");
    }
  }
  // ponytail: staff rate limit is 600 req/min/IP (worker rateLimit.ts) — a 429 needs
  // a bounded backoff honoring Retry-After; 1 attempt only, then surface the error
  if (res.status === 429) {
    const retryAfter = Math.min(Math.max(Number(res.headers.get("retry-after")) || 1, 1), 5);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    try {
      res = await post(AbortSignal.timeout(CBZ_LIMITS.timeoutMs));
    } catch {
      throw new Error("network");
    }
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { data?: { urls?: string[] }; urls?: string[] };
  const urls = body.data?.urls ?? body.urls ?? [];
  if (urls.length === 0) throw new Error("no-url");
  return urls[0];
}

export async function upsertChapter(opts: {
  comicId: string;
  chapterNumber: number;
  title: string;
  pageUrls: string[];
}): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${getGatewayUrl()}/api/admin/comics/${opts.comicId}/chapters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      chapterNumber: opts.chapterNumber,
      title: opts.title,
      pageUrls: opts.pageUrls,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

const USAGE_KEY = "cbz_import_usage";

interface UsageState {
  day: string;
  dayCount: number;
  month: string;
  monthCount: number;
}

export function trackPageUpload(count = 1): { dayCount: number; monthCount: number } {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  let state: UsageState = { day: today, dayCount: 0, month, monthCount: 0 };
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (raw) state = JSON.parse(raw) as UsageState;
  } catch {
    // ignore corrupt counter
  }
  if (state.day !== today) {
    state.day = today;
    state.dayCount = 0;
  }
  if (state.month !== month) {
    state.month = month;
    state.monthCount = 0;
  }
  state.dayCount += count;
  state.monthCount += count;
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(state));
  } catch {
    // quota full or private mode — counter is advisory only
  }
  return { dayCount: state.dayCount, monthCount: state.monthCount };
}
