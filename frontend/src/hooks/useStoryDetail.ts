import { useQuery } from '@tanstack/react-query';
import { SupabaseStoryRepository } from "@/services/repositories/SupabaseStoryRepository";
import { SupabaseChapterRepository } from "@/services/repositories/SupabaseChapterRepository";

export const useStoryDetail = (storyId: string) => {
  return useQuery({
    queryKey: ['story', storyId],
    queryFn: async () => {
      if (!storyId) return null;
      
      const storyRepo = new SupabaseStoryRepository();
      const chapterRepo = new SupabaseChapterRepository();


      const [story, chapters] = await Promise.all([
        storyRepo.getStoryById(storyId),
        chapterRepo.getChaptersByStoryId(storyId)
      ]);

      if (!story) throw new Error("Không tìm thấy truyện");


      const sortedChapters = chapters
        ? chapters.sort((a, b) => a.chapter_number - b.chapter_number)
        : [];

      return { story, chapters: sortedChapters };
    },
    enabled: !!storyId, 
    staleTime: 1000 * 60 * 5, 
  });
};