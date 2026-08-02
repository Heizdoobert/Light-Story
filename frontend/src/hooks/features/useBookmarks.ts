import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBookmarks } from '@/services/reader/readerHub.service';
import { toggleBookmark } from '@/actions/bookmarks.actions';

export function useBookmarks() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bookmarks'],
    queryFn: getBookmarks,
    staleTime: 60_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async (comicId: string) => {
      const wasBookmarked = (query.data ?? []).includes(comicId);
      const r = await toggleBookmark(comicId);
      if (!r.success) throw new Error(r.error ?? 'Bookmark toggle failed');
      return !wasBookmarked;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });

  return {
    bookmarks: query.data ?? [],
    isLoading: query.isLoading,
    isBookmarked: (comicId: string) => (query.data ?? []).includes(comicId),
    toggleBookmark: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
  };
}
