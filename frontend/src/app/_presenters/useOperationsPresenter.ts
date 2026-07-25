import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/apiClient';

async function fetchCount(type: 'profiles' | 'chapters') {
  const result = await apiClient.get<{ count: number }>(`/api/admin/site-metrics?type=${type}`);
  return result.count;
}

export function useProfileCountQuery() {
  return useQuery({ queryKey: ['operations', 'profileCount'], queryFn: () => fetchCount('profiles'), staleTime: 30_000 });
}

export function useChapterCountQuery() {
  return useQuery({ queryKey: ['operations', 'chapterCount'], queryFn: () => fetchCount('chapters'), staleTime: 30_000 });
}
