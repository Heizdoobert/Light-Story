'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptimisticUpdate } from './useOptimisticUpdate';
import { supabase } from '../core/supabase';

/**
 * Hook for story-related mutations with optimistic updates.
 */
export const useStoryMutations = () => {
  const queryClient = useQueryClient();
  const { optimisticToggleLike, optimisticIncrementViews } = useOptimisticUpdate();

  /**
   * Mutation to increment a story's view count.
   */
  const useIncrementViewMutation = () => {
    return useMutation({
      mutationFn: async (storyId: string) => {
        if (!supabase) throw new Error('Supabase not initialized');
        const { error } = await supabase.rpc('increment_story_views', { story_id: storyId });
        if (error) throw error;
      },
      onMutate: async (storyId) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: ['story', storyId] });
        // Apply optimistic update and return rollback function
        const rollback = optimisticIncrementViews(storyId);
        return { rollback };
      },
      onError: (err, storyId, context) => {
        if (context?.rollback) context.rollback();
      },
      onSettled: (data, error, storyId) => {
        queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      },
    });
  };

  /**
   * Mutation to toggle a story's like status.
   */
  const useLikeStoryMutation = () => {
    return useMutation({
      mutationFn: async ({ storyId, isCurrentlyLiked }: { storyId: string; isCurrentlyLiked: boolean }) => {
        if (!supabase) throw new Error('Supabase not initialized');
        const { error } = await supabase.rpc(isCurrentlyLiked ? 'unlike_story' : 'like_story', { story_id: storyId });
        if (error) throw error;
      },
      onMutate: async ({ storyId, isCurrentlyLiked }) => {
        await queryClient.cancelQueries({ queryKey: ['story', storyId] });
        const rollback = optimisticToggleLike(storyId, isCurrentlyLiked);
        return { rollback };
      },
      onError: (err, { storyId }, context) => {
        if (context?.rollback) context.rollback();
      },
      onSettled: (data, error, { storyId }) => {
        queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      },
    });
  };

  return {
    useIncrementViewMutation,
    useLikeStoryMutation,
  };
};
