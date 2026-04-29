import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

async function fetchAdConfigs() {
  const res = await fetch('/api/site-settings', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch ad settings');
  const json = await res.json();
  return json.data as Array<{ key: string; value: string | null }>;
}

async function postAdConfig(key: string, value: string) {
  const res = await fetch('/api/site-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) throw new Error('Failed to save ad config');
  return res.json();
}

export function useAdConfigsQuery() {
  return useQuery({ queryKey: ['site_settings', 'ad_slots'], queryFn: fetchAdConfigs, staleTime: 60_000 });
}

export function useUpdateAdConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => postAdConfig(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site_settings', 'ad_slots'] }),
  });
}
