'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Hook for optimistic updates to improve perceived performance.
 * Updates cache immediately before server responds, then reverts on error.
 */
export const useOptimisticUpdate = () => {
  const queryClient = useQueryClient();

  /**
   * Apply optimistic update to cached data.
   * @param queryKey - React Query key to update
   * @param updateFn - Function to update the cached data
   * @param revertFn - Optional function to revert cache on error
   */
  const applyOptimistic = useCallback(
    <T>(
      queryKey: any[],
      updateFn: (old: T) => T,
      revertFn?: (old: T) => T,
    ) => {
      const queryKey_normalized = Array.isArray(queryKey) ? queryKey : [queryKey];

      // Snapshot current cache for rollback
      const previousData = queryClient.getQueryData(queryKey_normalized);

      // Apply optimistic update
      if (previousData) {
        queryClient.setQueryData(queryKey_normalized, updateFn(previousData as T));
      }

      // Return rollback function
      return () => {
        if (previousData) {
          queryClient.setQueryData(
            queryKey_normalized,
            revertFn ? revertFn(previousData as T) : previousData,
          );
        }
      };
    },
    [queryClient],
  );

  /**
   * Update a story's like count optimistically.
   * Usage in mutation: onMutate with rollback on error.
   */
  const optimisticToggleLike = useCallback(
    (storyId: string, isCurrentlyLiked: boolean) => {
      const rollback = applyOptimistic(
        ['story', storyId],
        (old: any) => ({
          ...old,
          likes: old.likes + (isCurrentlyLiked ? -1 : 1),
          is_liked_by_user: !isCurrentlyLiked,
        }),
        (old: any) => ({
          ...old,
          likes: old.likes + (isCurrentlyLiked ? 1 : -1),
          is_liked_by_user: isCurrentlyLiked,
        }),
      );
      return rollback;
    },
    [applyOptimistic],
  );

  /**
   * Update a story's view count optimistically.
   */
  const optimisticIncrementViews = useCallback(
    (storyId: string) => {
      const rollback = applyOptimistic(
        ['story', storyId],
        (old: any) => ({
          ...old,
          views: (old.views || 0) + 1,
        }),
        (old: any) => ({
          ...old,
          views: Math.max(0, (old.views || 1) - 1),
        }),
      );
      return rollback;
    },
    [applyOptimistic],
  );

  return {
    applyOptimistic,
    optimisticToggleLike,
    optimisticIncrementViews,
  };
};
