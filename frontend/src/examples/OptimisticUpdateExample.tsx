'use client';

import React from 'react';
import { useStoryMutations } from '../hooks/useStoryMutations';

/**
 * Example component showing how to use the optimistic update mutations.
 * 
 * Pattern Explained:
 * 1. The mutations use 'onMutate' to update the React Query cache IMMEDIATELY.
 * 2. It returns a 'rollback' function in the context.
 * 3. If the server call fails, 'onError' executes the rollback to revert the UI.
 * 4. 'onSettled' ensures the cache is eventually synced with the server data.
 */
export const OptimisticUpdateExample = ({ storyId, isLiked }: { storyId: string; isLiked: boolean }) => {
  const { useIncrementViewMutation, useLikeStoryMutation } = useStoryMutations();
  
  const incrementViewMutation = useIncrementViewMutation();
  const likeMutation = useLikeStoryMutation();

  const handleLike = () => {
    // This will update the UI count and heart icon instantly
    likeMutation.mutate({ 
      storyId, 
      isCurrentlyLiked: isLiked 
    });
  };

  const handleView = () => {
    // This will update the view count instantly
    incrementViewMutation.mutate(storyId);
  };

  return (
    <div className="p-4 border rounded shadow">
      <h3 className="font-bold">Story Interactions</h3>
      <div className="flex gap-4 mt-2">
        <button 
          onClick={handleLike}
          className={`px-4 py-2 rounded ${isLiked ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
        >
          {likeMutation.isPending ? '...' : isLiked ? '?? Liked' : '?? Like'}
        </button>

        <button 
          onClick={handleView}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {incrementViewMutation.isPending ? '...' : '??? View'}
        </button>
      </div>
      
      <p className="mt-2 text-sm text-gray-500">
        Note: The UI updates instantly even if the network is slow!
      </p>
    </div>
  );
};

export default OptimisticUpdateExample;
