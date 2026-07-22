import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBookmarks, toggleBookmark } from '@/services/readerHub.service';

export function useBookmarks() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bookmarks'],
    queryFn: getBookmarks,
    staleTime: 60_000,
  });

  const toggleMutation = useMutation({
    mutationFn: toggleBookmark,
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
