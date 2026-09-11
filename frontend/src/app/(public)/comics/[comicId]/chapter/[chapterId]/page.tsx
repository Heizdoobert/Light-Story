import { ChapterReaderPageContent } from "@/components/reader/ChapterReaderPageContent";
import type { ReaderInitialData, ReaderChapterListItem } from "@/hooks/presenters/useReadChapterPresenter";
import { getGatewayUrl } from "@/lib/utils/gateway-url";
import { getServerSupabase } from "@/lib/supabase/server";
import { decryptFieldClient } from "@/lib/security/encryption";
import { parseChapterContent } from "@/lib/r2/chapter-content";
import { proxiedR2ImageUrl } from "@/services/comics/comicCms.service";
import type { ComicContext } from "@/services/comics/comic.service";
import type { Chapter } from "@/types/entities";

export const dynamic = "force-dynamic";

async function fetchGatewayData<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${getGatewayUrl()}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as
      | { success?: boolean; data?: unknown }
      | null;
    if (!body || body.success === false) return null;
    return (body.data !== undefined ? body.data : body) as T;
  } catch {
    return null;
  }
}

function sanitizeChapterList(chapters: Chapter[]): ReaderChapterListItem[] {
  return chapters.map(({ id, chapter_number, title, created_at }) => ({
    id,
    chapter_number,
    title,
    created_at,
  }));
}

async function loadReaderData(
  comicId: string,
  chapterId: string,
): Promise<ReaderInitialData | null> {
  const [storyPromise, chaptersPromise] = await Promise.all([
    fetchGatewayData<ComicContext>(`/api/stories/${comicId}`),
    fetchGatewayData<Chapter[]>(`/api/chapters?storyId=${comicId}`),
  ]);
  let story: ComicContext | null = storyPromise;
  const chapters = chaptersPromise;

  const sorted = (chapters ?? [])
    .slice()
    .sort((a, b) => (a.chapter_number ?? 0) - (b.chapter_number ?? 0));

  let current: Chapter | null =
    sorted.find((ch) => ch.id === chapterId) ?? null;

  if (!current) {
    const detail = await fetchGatewayData<any>(
      `/api/comics/${comicId}/chapters/${chapterId}`,
    );
    current =
      Array.isArray(detail) ? detail[0] : detail?.chapter ?? detail ?? null;
  }

  if (!current || !story) {
    // Server-side fallback: gateway down or row missing. Mirrors the client's
    // legacy fallback so a gateway outage doesn't dead-end the reader.
    const sb = getServerSupabase();
    if (sb) {
      const [storyRes, chapterRes] = await Promise.all([
        story ? Promise.resolve(null) : sb.from("stories").select("*").eq("id", comicId).maybeSingle(),
        current ? Promise.resolve(null) : sb.from("chapters").select("*").eq("id", chapterId).maybeSingle(),
      ]);
      if (!story && storyRes?.data) {
        // gateway and supabase row shapes are near-identical; loose cast mirrors the client fallback
        story = storyRes.data as unknown as ComicContext;
      }
      if (!current && chapterRes?.data) current = chapterRes.data as Chapter;
    }
  }

  if (!current) {
    return {
      comic: story,
      allChapters: sanitizeChapterList(sorted),
      currentChapter: null,
      images: [],
      requiresCbzUnpack: false,
    };
  }

  const content =
    typeof current.content === "string" && current.content.startsWith("ENCv1:")
      ? await decryptFieldClient(current.content)
      : current.content;

  const parsed = parseChapterContent(content);

  return {
    comic: story,
    allChapters: sanitizeChapterList(sorted),
    currentChapter: current,
    images: parsed.isCbz ? [] : parsed.imageUrls.map(proxiedR2ImageUrl),
    requiresCbzUnpack: parsed.isCbz,
  };
}

export default async function ChapterReaderPage({
  params,
}: {
  params: Promise<{ comicId: string; chapterId: string }>;
}) {
  const { comicId, chapterId } = await params;

  let initialData: ReaderInitialData | null = null;
  try {
    initialData = await loadReaderData(comicId, chapterId);
  } catch {
    // leave null — client presenter keeps its own fetch fallback
  }

  return <ChapterReaderPageContent initialData={initialData} />;
}
