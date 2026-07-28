import { useQuery } from '@tanstack/react-query';
import { fetchTranslators } from '@/services/comics/taxonomy.service';

export function useTranslatorPresenter() {
  const translatorsQuery = useQuery({
    queryKey: ['translators'],
    queryFn: () => fetchTranslators(),
  });

  return { translatorsQuery };
}
