import { useQuery } from "@tanstack/react-query";
import { apiClient } from '@/lib/api/apiClient';

type ChapterDetail = {
  id: string;
  title?: string;
  chapter_number?: number;
  image_urls?: string[];
  images?: string[];
  [key: string]: unknown;
};

export const useChapterDetail = (chapterId: string) => {
  return useQuery({
    queryKey: ["chapter", chapterId],
    queryFn: async () => {
      if (!chapterId) return null;
      return apiClient.get<ChapterDetail>(`/api/chapters?id=${chapterId}`);
    },
    enabled: !!chapterId,
    staleTime: 1000 * 60 * 60,
  });
};
