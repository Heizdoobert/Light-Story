import { apiClient } from '@/lib/api/apiClient';
import { fetchSystemSettingsSnapshot } from '@/services/admin/systemSettings.service';

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

export async function getAuditLogs(limit = 200) {
  return apiClient.get<Array<any>>(`/api/admin/audit?limit=${limit}`);
}

export async function getProfilesByIds(ids: string[]) {
  if (ids.length === 0) return [] as Array<any>;
  return apiClient.get<Array<any>>(`/api/admin/profiles/by-ids?ids=${encodeURIComponent(ids.join(','))}`);
}

export async function getSystemNotifications(limit = 20) {
  try {
    const res = await apiClient.get<{ notifications: any[] }>(
      `/api/admin/notifications?limit=${limit}`
    );
    return res.notifications || [];
  } catch {
    return [];
  }
}
