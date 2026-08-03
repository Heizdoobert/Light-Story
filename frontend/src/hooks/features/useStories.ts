import { useQuery } from '@tanstack/react-query';
import * as storyService from '@/services/comics/story.service';
import { incrementStoryView } from '@/actions/stories.actions';
import type { IncrementStoryViewInput } from '@/actions/stories.actions';
import { toast } from 'sonner';

export const useStories = () => {
  const storiesQuery = useQuery({
    queryKey: ['stories'],
    queryFn: () => storyService.fetchStories(),
    staleTime: 1000 * 60 * 5,
  });

  const incrementView = async (input: IncrementStoryViewInput) => {
    const result = await incrementStoryView(input);
    if (!result.success) {
      console.error('Failed to increment view:', result.error);
      toast.error('Failed to increment view');
    }
    return result;
  };

  return {
    stories: storiesQuery.data || [],
    isLoading: storiesQuery.isLoading,
    error: storiesQuery.error,
    incrementView,
  };
};

export default useStories;


