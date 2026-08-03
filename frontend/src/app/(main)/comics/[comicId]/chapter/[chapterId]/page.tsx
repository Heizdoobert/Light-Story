import type { Metadata } from "next";
import { fetchApi } from "@/actions/http";
import { ChapterReaderPageContent } from "@/components/reader/ChapterReaderPageContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ comicId: string; chapterId: string }>;
}): Promise<Metadata> {
  const { comicId, chapterId } = await params;
  try {
    const [comicRes, chapterRes] = await Promise.all([
      fetchApi(`/api/comics/${comicId}`),
      fetchApi(`/api/comics/${comicId}/chapters/${chapterId}`),
    ]);
    if (!comicRes.ok || !chapterRes.ok) return {};
    const [comicBody, chapterBody] = (await Promise.all([
      comicRes.json(),
      chapterRes.json(),
    ])) as [Record<string, any>, Record<string, any>];
    const comic = Array.isArray(comicBody) ? comicBody[0] : comicBody?.comic || comicBody;
    const chapter = Array.isArray(chapterBody)
      ? chapterBody[0]
      : chapterBody?.chapter || chapterBody;
    const title = chapter?.title
      ? `${comic?.title ? `${comic.title} - ` : ""}${chapter.title}`
      : comic?.title;
    if (!title) return {};
    return {
      title,
      description:
        comic?.description?.slice(0, 160) || chapter?.title || undefined,
    };
  } catch {
    return {};
  }
}

export default function ReadChapterPage() {
  return <ChapterReaderPageContent />;
}
