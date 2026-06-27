import { apiClient } from '@/lib/apiClient';
import { fetchSystemSettingsSnapshot } from '@/services/systemSettings.service';

export async function logDashboardAccess(actorUserId: string) {
  void actorUserId;
}

export async function getDashboardData() {
  try {
    const data = await apiClient.get<{
      stories?: Array<Record<string, unknown>>;
      stats?: { totalStories?: number; totalChapters?: number; activeStories?: number; totalViews?: number };
    }>('/api/admin/analytics/dashboard?range=7d');

    const stories = Array.isArray(data?.stories) ? data.stories : [];
    const totalViews = Number(data?.stats?.totalViews ?? stories.reduce((sum: number, s: any) => sum + (Number(s.views) || 0), 0));
    const activeStories = Number(data?.stats?.activeStories ?? 0);
    const totalChapters = Number(data?.stats?.totalChapters ?? 0);

    return {
      stories,
      stats: { totalViews, activeStories, totalChapters },
      syncedAt: new Date().toISOString(),
    };
  } catch (e) {
    if (process.env.NODE_ENV === 'development') console.warn('[AdminDashboardQueryGateway]', e);
    return {
      stories: [],
      stats: { totalViews: 0, activeStories: 0, totalChapters: 0 },
      syncedAt: new Date().toISOString(),
    };
  }
}

export async function getUiSettings() {
  return fetchSystemSettingsSnapshot();
}

export async function getStoriesFieldValues(field: 'category' | 'author_id') {
  return apiClient.get<Array<Record<string, string | null>>>(`/api/admin/stories/field-values?field=${encodeURIComponent(field)}`);
}

export async function getProfileCount() {
  try {
    const res = await apiClient.get<{ count?: number }>('/api/admin/site-metrics?type=profiles');
    return Number(res?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function getChapterCount() {
  try {
    const res = await apiClient.get<{ count?: number }>('/api/admin/site-metrics?type=chapters');
    return Number(res?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function getAdSettingsCount() {
  try {
    const res = await apiClient.get<{ count?: number }>('/api/admin/site-metrics?type=site-settings');
    return Number(res?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function getRoleDistribution() {
  try {
    const res = await apiClient.get<Array<{ role: string; total: number }>>('/api/admin/role-distribution');
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export default {};

export async function fetchProfiles() {
  return apiClient.get<Array<any>>('/api/admin/profiles?page=1&pageSize=500');
}

export async function updateProfileRole(id: string, role: string) {
  const result = await apiClient.post<{ ok: boolean }>('/api/admin/profiles', { action: 'updateRole', id, role });
  return result;
}

export async function updateProfileName(id: string, full_name: string | null) {
  const result = await apiClient.post<{ ok: boolean }>('/api/admin/profiles', { action: 'updateName', id, full_name });
  return result;
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const sbKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith('sb-') && k.endsWith('-auth-token'),
    );
    if (sbKeys.length === 0) return null;
    const raw = localStorage.getItem(sbKeys[0]);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function callManageUserFunction(body: Record<string, unknown>) {
  const accessToken = getAccessToken();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  try {
    const data = await apiClient.post<any>('/api/admin/manage-user', body);
    return { data, error: null };
  } catch (err: any) {
    const errorMessage = err?.message ?? 'Request failed';
    const shouldFallbackToEdgeFunction =
      err?.status >= 500 &&
      /server supabase unavailable|createUser failed|createUser exception|Internal error|Cannot read properties of undefined/i.test(errorMessage);

    if (shouldFallbackToEdgeFunction && supabaseUrl && supabaseKey && accessToken) {
      const edgeResponse = await fetch(`${supabaseUrl}/functions/v1/manage-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      const edgeJson = await edgeResponse.json().catch(() => ({ raw: '' }));
      if (!edgeResponse.ok) {
        return { data: edgeJson, error: new Error(edgeJson?.error ?? `Request failed ${edgeResponse.status}`) };
      }

      return { data: edgeJson, error: null };
    }

    return { data: null, error: err instanceof Error ? err : new Error(errorMessage) };
  }
}

export async function getAuditLogs(limit = 200) {
  return apiClient.get<Array<any>>(`/api/admin/audit?limit=${limit}`);
}

export async function getProfilesByIds(ids: string[]) {
  if (ids.length === 0) return [] as Array<any>;
  return apiClient.get<Array<any>>(`/api/admin/profiles/by-ids?ids=${encodeURIComponent(ids.join(','))}`);
}
