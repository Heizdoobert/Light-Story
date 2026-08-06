import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { ComicDetailPageContent } from '@/components/comics/ComicDetailPageContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ comicId: string }>;
}): Promise<Metadata> {
  const { comicId } = await params;

  let title = "Truyện tranh - Light Story";
  let description =
    "Đọc truyện tranh tại Light Story — cập nhật nhanh, đọc mượt mà trên mọi thiết bị.";

  try {
    const db = await getServerSupabase();
    if (db) {
      const { data } = await db
        .from("stories")
        .select("title, author")
        .eq("id", comicId)
        .maybeSingle();
      if (data?.title) {
        title = `${data.title} - Light Story`;
        description = data.author
          ? `Đọc truyện "${data.title}" của tác giả ${data.author} tại Light Story.`
          : `Đọc truyện "${data.title}" tại Light Story.`;
      }
    }
  } catch {
    // fall back to defaults when the database is unreachable
  }

  return { title, description };
}

export default function ComicDetailPage() {
  return <ComicDetailPageContent />;
}
