import type { Metadata } from "next";
import { SearchPageContent } from "@/components/comics/SearchPageContent";
import { searchClient, type SearchPageResult, type StoryItem } from "@/sdk/gateway";

export const metadata: Metadata = {
  title: "Tìm kiếm truyện - Light Story",
  description:
    "Tìm kiếm và khám phá truyện tranh tại Light Story — theo từ khóa, thể loại, sắp xếp mới nhất.",
};

interface SearchPageProps {
  searchParams?: Promise<{
    keyword?: string;
    category?: string;
    tag?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = searchParams ? await searchParams : {};
  let initialData: SearchPageResult<StoryItem> | null = null;

  try {
    const pageNum = parseInt(params.page || "1", 10) || 1;
    initialData = await searchClient.searchStories({
      keyword: params.keyword || undefined,
      category: params.category && params.category !== "all" ? params.category : undefined,
      tag: params.tag && params.tag !== "all" ? decodeURIComponent(params.tag) : undefined,
      sort: params.sort,
      page: pageNum,
      pageSize: 12,
    });
  } catch (err) {
    // Graceful degradation: client presenter will fetch if gateway SSR is unavailable
    console.warn("[SearchPage SSR] searchClient.searchStories failed", err);
  }

  return (
    <SearchPageContent
      initialCategory={params.category}
      initialData={initialData}
    />
  );
}
