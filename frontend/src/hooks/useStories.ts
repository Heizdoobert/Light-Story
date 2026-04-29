import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as storyService from '@/services/story.service';
import { toast } from 'sonner';

export const useStories = () => {
  const queryClient = useQueryClient();

  const storiesQuery = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      // service handles supabase access
      const res = await storyService.fetchStories();
      // if using paged result, adapt as needed
      return Array.isArray(res) ? res : res.items;
    },
    staleTime: 1000 * 60 * 5,
  });

  const incrementViewMutation = useMutation({
    mutationFn: async (storyId: string) => {
      await storyService.incrementViews(storyId);
    },
    onMutate: async (storyId) => {
      await queryClient.cancelQueries({ queryKey: ['stories'] });
      const previousStories = queryClient.getQueryData(['stories']);

      queryClient.setQueryData(['stories'], (old: any) =>
        old?.map((s: any) => (s.id === storyId ? { ...s, views: (s.views || 0) + 1 } : s))
      );

      return { previousStories };
    },
    onError: (err, storyId, context) => {
      queryClient.setQueryData(['stories'], context?.previousStories);
      console.error('Failed to increment view:', err);
      toast.error('Failed to increment view');
    },
  });

  return {
    stories: storiesQuery.data || [],
    isLoading: storiesQuery.isLoading,
    error: storiesQuery.error,
    incrementView: incrementViewMutation.mutate,
  };
};

export default useStories;

