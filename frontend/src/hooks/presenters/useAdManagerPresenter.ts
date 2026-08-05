import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/apiClient';
import * as adActions from '@/actions/ads.actions';

export type AdSettingItem = { key: string; value: unknown };

async function fetchAdConfigs() {
  return apiClient.get<AdSettingItem[]>('/api/admin/site-settings?scope=admin');
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
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const res = await adActions.updateAdConfig({ key, value });
      if (!res.success) {
        throw new Error(res.error ?? 'Failed to update ad configuration');
      }
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site_settings', 'ad_slots'] });
      qc.invalidateQueries({ queryKey: ['site_settings', 'ad_runtime'] });
    },
  });
}
