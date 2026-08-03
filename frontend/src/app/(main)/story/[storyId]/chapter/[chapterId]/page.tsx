import type { Metadata } from "next";
import { fetchApi } from "@/actions/http";
import { StoryChapterReaderPageContent } from "@/components/story/StoryChapterReaderPageContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storyId: string; chapterId: string }>;
}): Promise<Metadata> {
  const { storyId, chapterId } = await params;
  try {
    const [storyRes, chapterRes] = await Promise.all([
      fetchApi(`/api/stories/${storyId}`),
      fetchApi(`/api/chapters?id=${encodeURIComponent(chapterId)}`),
    ]);
    if (!storyRes.ok || !chapterRes.ok) return {};
    const [storyBody, chapterBody] = (await Promise.all([
      storyRes.json(),
      chapterRes.json(),
    ])) as [Record<string, any>, Record<string, any>];
    const story = Array.isArray(storyBody) ? storyBody[0] : storyBody?.story || storyBody;
    const chapter = Array.isArray(chapterBody)
      ? chapterBody[0]
      : chapterBody?.chapter || chapterBody;
    const title = chapter?.title
      ? `${story?.title ? `${story.title} - ` : ""}${chapter.title}`
      : story?.title;
    if (!title) return {};
    return {
      title,
      description:
        story?.description?.slice(0, 160) || chapter?.title || undefined,
    };
  } catch {
    return {};
  }
}

export default function StoryChapterPage() {
  return <StoryChapterReaderPageContent />;
}
