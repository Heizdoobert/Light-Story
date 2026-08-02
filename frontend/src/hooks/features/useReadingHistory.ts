import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReadingHistory, mirrorReadingHistory } from '@/services/reader/readerHub.service';
import { saveReadingProgress } from '@/actions/reading-history.actions';

export function useReadingHistory() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['reading-history'],
    queryFn: getReadingHistory,
    staleTime: 30_000,
  });

  const recordMutation = useMutation({
    mutationFn: async (args: { comicId: string; chapterId: string; chapterNumber: number }) => {
      mirrorReadingHistory(args);
      await saveReadingProgress(args);
      return args;
    },
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
