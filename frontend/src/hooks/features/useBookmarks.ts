import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBookmarks } from '@/services/reader/readerHub.service';
import {
  addBookmark as addBookmarkAction,
  removeBookmark as removeBookmarkAction,
  toggleBookmark as toggleBookmarkAction,
} from '@/actions/bookmarks.actions';

export function useBookmarks() {
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = useState(false);

  const query = useQuery({
    queryKey: ['bookmarks'],
    queryFn: getBookmarks,
    staleTime: 60_000,
  });

  const addBookmark = useCallback(
    async (comicId: string): Promise<boolean> => {
      setIsToggling(true);
      try {
        const r = await addBookmarkAction(comicId);
        if (!r.success) throw new Error(r.error ?? 'Failed to add bookmark');
        await queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
        return true;
      } finally {
        setIsToggling(false);
      }
    },
    [queryClient]
  );

  const removeBookmark = useCallback(
    async (comicId: string): Promise<boolean> => {
      setIsToggling(true);
      try {
        const r = await removeBookmarkAction(comicId);
        if (!r.success) throw new Error(r.error ?? 'Failed to remove bookmark');
        await queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
        return false;
      } finally {
        setIsToggling(false);
      }
    },
    [queryClient]
  );

  const toggleBookmark = useCallback(
    async (comicId: string): Promise<boolean> => {
      setIsToggling(true);
      try {
        const wasBookmarked = (query.data ?? []).includes(comicId);
        const r = await toggleBookmarkAction(comicId);
        if (!r.success) throw new Error(r.error ?? 'Bookmark toggle failed');
        await queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
        return !wasBookmarked;
      } finally {
        setIsToggling(false);
      }
    },
    [query.data, queryClient]
  );

  return {
    bookmarks: query.data ?? [],
    isLoading: query.isLoading,
    isBookmarked: (comicId: string) => (query.data ?? []).includes(comicId),
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isToggling,
  };
}
