/*
  useStories.ts - Hardened Data Hook
  Implements Optimistic Updates and Error Handling via React Query
*/
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../core/supabase';
import { toast } from 'sonner';

export const useStories = () => {
  const queryClient = useQueryClient();

  // Fetch stories with error boundary support
  const storiesQuery = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase not initialized');
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Optimistic View Increment
  const incrementViewMutation = useMutation({
    mutationFn: async (storyId: string) => {
      if (!supabase) return;
      const { error } = await supabase.rpc('increment_story_views', { story_id: storyId });
      if (error) throw error;
    },
    onMutate: async (storyId) => {
      await queryClient.cancelQueries({ queryKey: ['stories'] });
      const previousStories = queryClient.getQueryData(['stories']);

      queryClient.setQueryData(['stories'], (old: any) => 
        old?.map((s: any) => s.id === storyId ? { ...s, views: s.views + 1 } : s)
      );

      return { previousStories };
    },
    onError: (err, storyId, context) => {
      queryClient.setQueryData(['stories'], context?.previousStories);
      console.error('Failed to increment view:', err);
    },
  });

  return {
    stories: storiesQuery.data || [],
    isLoading: storiesQuery.isLoading,
    error: storiesQuery.error,
    incrementView: incrementViewMutation.mutate
  };
};
