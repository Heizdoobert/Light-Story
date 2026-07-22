import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReadingHistory, recordReadingHistory } from '@/services/readerHub.service';

export function useReadingHistory() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['reading-history'],
    queryFn: getReadingHistory,
    staleTime: 30_000,
  });

  const recordMutation = useMutation({
    mutationFn: ({ comicId, chapterId, chapterNumber }: { comicId: string; chapterId: string; chapterNumber: number }) =>
      recordReadingHistory(comicId, chapterId, chapterNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-history'] });
    },
  });

  return {
    history: query.data ?? [],
    isLoading: query.isLoading,
    recordHistory: recordMutation.mutate,
  };
}
