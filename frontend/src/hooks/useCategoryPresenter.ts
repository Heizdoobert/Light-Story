import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as adminService from '@/services/admin.service';
import { fetchCategories } from '@/services/taxonomy.service';

export function useCategoryPresenter() {
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  const linkQuery = useQuery({
    queryKey: ['category-story-links'],
    queryFn: () => adminService.getStoriesFieldValues('category'),
  });

  const linkedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of linkQuery.data ?? []) {
      const id = (row as any).category as string | null;
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [linkQuery.data]);

  return { categoriesQuery, linkQuery, linkedCounts };
}
