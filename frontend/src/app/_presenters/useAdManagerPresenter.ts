import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type AdSettingItem = { key: string; value: unknown };

async function fetchAdConfigs() {
  const res = await fetch('/api/site-settings?scope=admin', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch ad settings');
  const json = await res.json();
  return (json.data ?? []) as AdSettingItem[];
}

async function postAdConfig(key: string, value: unknown) {
  const res = await fetch('/api/site-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) throw new Error('Failed to save ad config');
  return res.json();
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
