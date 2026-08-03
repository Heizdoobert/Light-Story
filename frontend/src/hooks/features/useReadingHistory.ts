import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getReadingHistory, mirrorReadingHistory } from '@/services/reader/readerHub.service';
import { saveReadingProgress, clearReadingHistory } from '@/actions/reading-history.actions';

export function useReadingHistory() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['reading-history'],
    queryFn: getReadingHistory,
    staleTime: 30_000,
  });

  const recordHistory = async (args: { comicId: string; chapterId: string; chapterNumber: number }) => {
    mirrorReadingHistory(args);
    const res = await saveReadingProgress(args);
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ['reading-history'] });
    }
    return res;
  };

  const clearHistory = async () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('reader:history');
      } catch {}
    }
    const res = await clearReadingHistory();
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ['reading-history'] });
    }
    return res;
  };

  return {
    history: query.data ?? [],
    isLoading: query.isLoading,
    recordHistory,
    clearHistory,
  };
}
