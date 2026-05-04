import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as adminService from '@/services/admin.service';
import { SupabaseTaxonomyRepository } from '@/infrastructure/repositories/SupabaseTaxonomyRepository';

const taxonomyRepo = new SupabaseTaxonomyRepository();

export function useCategoryPresenter() {
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => taxonomyRepo.getCategories(),
  });

  const linkQuery = useQuery({
    queryKey: ['category-story-links'],
    queryFn: () => adminService.getStoriesFieldValues('category_id'),
  });

  const linkedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of linkQuery.data ?? []) {
      const id = (row as any).category_id as string | null;
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [linkQuery.data]);

  return { categoriesQuery, linkQuery, linkedCounts };
}
