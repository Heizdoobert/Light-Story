import { useQuery } from '@tanstack/react-query';

async function fetchCount(type: 'profiles' | 'chapters') {
  const res = await fetch(`/api/site-metrics?type=${type}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${type}`);
  const json = await res.json();
  return json.count as number;
}

export function useProfileCountQuery() {
  return useQuery({ queryKey: ['operations', 'profileCount'], queryFn: () => fetchCount('profiles'), staleTime: 30_000 });
}

export function useChapterCountQuery() {
  return useQuery({ queryKey: ['operations', 'chapterCount'], queryFn: () => fetchCount('chapters'), staleTime: 30_000 });
}
