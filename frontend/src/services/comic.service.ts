export type ComicContext = {
  id: string;
  tenantKey: string;
  storyId: string;
  title: string;
  slug: string;
  description: string;
  author: string;
  status: "ongoing" | "completed";
  category: string[];
  viewCount: number;
  coverUrl: string;
  createdAt?: string;
  updatedAt?: string;
};

type CreateComicInput = {
  title: string;
  description: string;
  coverUrl: string;
  author?: string;
  status?: "ongoing" | "completed";
  category?: string[];
};

type ChapterCreateInput = {
  comicId: string;
  tenantKey: string;
  storyId: string;
  chapterNumber: number;
  title: string;
  content: unknown;
};

type ComicCreateResponse = {
  comic: ComicContext;
};

const COMIC_CONTEXT_INDEX_KEY = "light-story:comic-context:index";

type ChapterCreateResponse = {
  chapter: {
    id: string;
    story_id: string;
    chapter_number: number;
    title: string;
    content: string;
    view_count: number;
  };
};

async function uploadFilesToR2(bucket: string, files: File[]): Promise<string[]> {
  const allowDevFallback = process.env.NEXT_PUBLIC_ENABLE_LOCAL_DEV_FALLBACK === "true";

  // If bucket is not configured, only allow local mock URLs when explicitly enabled.
  if (!bucket) {
    if (process.env.NODE_ENV === "production" || !allowDevFallback) {
      throw new Error("R2 bucket is not configured");
    }

    // Dev fallback: return placeholder image URLs so the UI can render images.
    return files.map((file, i) => {
      const safeName = encodeURIComponent(file.name.replace(/\s+/g, "-"));
      return `https://placehold.co/600x800?text=dev+${safeName}+${Date.now() + i}`;
    });
  }

  const form = new FormData();
  files.forEach((file) => form.append("file", file));

  const response = await fetch("/functions/v1/upload_to_r2", {
    method: "POST",
    headers: {
      "x-r2-bucket": bucket,
    },
    body: form,
  });

  const data = (await response.json()) as { urls?: string[]; error?: string };
  if (!response.ok || data.error) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data.urls ?? [];
}

export async function uploadComicCover(cover: File): Promise<string> {
  const bucket = process.env.NEXT_PUBLIC_R2_BUCKET_COVERS;
  const urls = await uploadFilesToR2(bucket ?? "", [cover]);

  if (urls.length === 0) {
    throw new Error("Unable to upload comic cover");
  }

  return urls[0];
}

export async function uploadChapterImages(images: File[]): Promise<string[]> {
  const bucket = process.env.NEXT_PUBLIC_R2_BUCKET_CHAPTERS;
  return uploadFilesToR2(bucket ?? "", images);
}

export function getComicContextStorageKey(comicId: string): string {
  return `light-story:comic-context:${comicId}`;
}

export function saveComicContext(context: ComicContext): void {
  if (typeof window === "undefined") return;

  const currentIndex = listComicContextIds();
  const nextIndex = [context.id, ...currentIndex.filter((id) => id !== context.id)].slice(0, 100);

  window.localStorage.setItem(getComicContextStorageKey(context.id), JSON.stringify(context));
  window.localStorage.setItem(COMIC_CONTEXT_INDEX_KEY, JSON.stringify(nextIndex));
}

function listComicContextIds(): string[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(COMIC_CONTEXT_INDEX_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

export function loadComicContext(comicId: string): ComicContext | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(getComicContextStorageKey(comicId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ComicContext>;
    if (!parsed.id || !parsed.tenantKey || !parsed.storyId) return null;

    const parsedCategory = Array.isArray(parsed.category)
      ? parsed.category.filter((item): item is string => typeof item === "string")
      : [];

    const parsedStatus = parsed.status === "completed" ? "completed" : "ongoing";

    return {
      id: parsed.id,
      tenantKey: parsed.tenantKey,
      storyId: parsed.storyId,
      title: String(parsed.title ?? ""),
      slug: String(parsed.slug ?? ""),
      description: String(parsed.description ?? ""),
      author: String(parsed.author ?? ""),
      status: parsedStatus,
      category: parsedCategory,
      viewCount: Number(parsed.viewCount ?? 0),
      coverUrl: String(parsed.coverUrl ?? ""),
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : undefined,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
    };
  } catch {
    return null;
  }
}

export function listComicContexts(): ComicContext[] {
  const ids = listComicContextIds();
  return ids
    .map((id) => loadComicContext(id))
    .filter((context): context is ComicContext => Boolean(context));
}

export async function createComic(input: CreateComicInput): Promise<ComicContext> {
  const response = await fetch("/api/internal/admin/comics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      cover_url: input.coverUrl,
      author: input.author ?? "Unknown",
      status: input.status ?? "ongoing",
      category: input.category ?? [],
    }),
  });

  const data = (await response.json()) as Partial<ComicCreateResponse> & { error?: string };
  if (!response.ok || data.error) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  if (!data.comic) {
    throw new Error("Comic creation succeeded but no comic was returned");
  }

  return data.comic;
}

export async function createComicChapter(input: ChapterCreateInput): Promise<ChapterCreateResponse["chapter"]> {
  const response = await fetch(`/api/internal/admin/comics/${input.comicId}/chapters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storyId: input.storyId,
      tenantKey: input.tenantKey,
      chapterNumber: input.chapterNumber,
      title: input.title,
      content: input.content,
    }),
  });

  const data = (await response.json()) as Partial<ChapterCreateResponse> & { error?: string };
  if (!response.ok || data.error) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  if (!data.chapter) {
    throw new Error("Chapter creation succeeded but no chapter was returned");
  }

  return data.chapter;
}