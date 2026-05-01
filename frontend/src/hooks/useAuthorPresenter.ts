import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as adminService from '@/services/admin.service';
import { SupabaseTaxonomyRepository } from '@/infrastructure/repositories/SupabaseTaxonomyRepository';

const taxonomyRepo = new SupabaseTaxonomyRepository();

export function useAuthorPresenter() {
  const authorsQuery = useQuery({
    queryKey: ['authors'],
    queryFn: () => taxonomyRepo.getAuthors(),
  });

  const linkQuery = useQuery({
    queryKey: ['author-story-links'],
    queryFn: () => adminService.getStoriesFieldValues('author_id'),
  });

  const linkedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of linkQuery.data ?? []) {
      const id = (row as any).author_id as string | null;
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [linkQuery.data]);

  return { authorsQuery, linkQuery, linkedCounts };
}
