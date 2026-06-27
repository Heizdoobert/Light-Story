import { useQuery } from '@tanstack/react-query';
import { fetchStoryById } from '@/services/story.service';
import { fetchChaptersByStoryId } from '@/services/chapter.service';

export const useStoryDetail = (storyId: string) => {
  return useQuery({
    queryKey: ['story', storyId],
    queryFn: async () => {
      if (!storyId) return null;

      const [story, chapters] = await Promise.all([
        fetchStoryById(storyId),
        fetchChaptersByStoryId(storyId)
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