import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export type AdSettingItem = { key: string; value: unknown };

async function fetchAdConfigs() {
  return apiClient.get<AdSettingItem[]>('/api/admin/site-settings?scope=admin');
}

async function postAdConfig(key: string, value: unknown) {
  return apiClient.post('/api/admin/site-settings', { key, value });
}

export function useAdConfigsQuery() {
  return useQuery({
    queryKey: ['site_settings', 'ad_slots'],
    queryFn: fetchAdConfigs,
    staleTime: 20_000,
    gcTime: 300_000,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });
}

export function useUpdateAdConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => postAdConfig(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site_settings', 'ad_slots'] });
      qc.invalidateQueries({ queryKey: ['site_settings', 'ad_runtime'] });
    },
  });
}
