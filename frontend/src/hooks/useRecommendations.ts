import { useQuery } from '@tanstack/react-query';
import { getRecommendations } from '@/services/comic.service';

export function useRecommendations(comicId: string, limit = 6) {
  return useQuery({
    queryKey: ['recommendations', comicId, limit],
    queryFn: () => getRecommendations(comicId, limit),
    enabled: !!comicId,
    staleTime: 300_000,
  });
}
