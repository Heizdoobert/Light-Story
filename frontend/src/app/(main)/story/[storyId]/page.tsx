import type { Metadata } from "next";
import { fetchApi } from "@/actions/http";
import { StoryDetailPageContent } from "@/components/story/StoryDetailPageContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storyId: string }>;
}): Promise<Metadata> {
  const { storyId } = await params;
  try {
    const res = await fetchApi(`/api/stories/${storyId}`);
    if (!res.ok) return {};
    const body = (await res.json()) as Record<string, any>;
    const story = Array.isArray(body) ? body[0] : body?.story || body;
    if (!story?.title) return {};
    return {
      title: story.title,
      description: story.description?.slice(0, 160) || undefined,
    };
  } catch {
    return {};
  }
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;
  return <StoryDetailPageContent storyId={storyId} />;
}
