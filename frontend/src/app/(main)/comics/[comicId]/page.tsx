import type { Metadata } from "next";
import { fetchApi } from "@/actions/http";
import { ComicDetailPageContent } from "@/components/comics/ComicDetailPageContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ comicId: string }>;
}): Promise<Metadata> {
  const { comicId } = await params;
  try {
    const res = await fetchApi(`/api/comics/${comicId}`);
    if (!res.ok) return {};
    const body = (await res.json()) as Record<string, any>;
    const comic = Array.isArray(body) ? body[0] : body?.comic || body;
    if (!comic?.title) return {};
    return {
      title: comic.title,
      description: comic.description?.slice(0, 160) || undefined,
    };
  } catch {
    return {};
  }
}

export default function ComicDetailPage() {
  return <ComicDetailPageContent />;
}
