import { ROUTES } from '@/lib/constants/routes';
import { apiClient } from '@/lib/api/apiClient';

export async function getStoriesFieldValues(field: 'category' | 'author_id') {
  return apiClient.get<Array<Record<string, string | null>>>(ROUTES.API.ADMIN.STORIES_FIELD_VALUES(field));
}

export async function getProfileCount() {
  try {
    const res = await apiClient.get<{ count?: number }>(ROUTES.API.ADMIN.SITE_METRICS('profiles'));
    return Number(res?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function getChapterCount() {
  try {
    const res = await apiClient.get<{ count?: number }>(ROUTES.API.ADMIN.SITE_METRICS('chapters'));
    return Number(res?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function getAdSettingsCount() {
  try {
    const res = await apiClient.get<{ count?: number }>(ROUTES.API.ADMIN.SITE_METRICS('site-settings'));
    return Number(res?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function getRoleDistribution() {
  try {
    const res = await apiClient.get<Array<{ role: string; total: number }>>(ROUTES.API.ADMIN.ROLE_DISTRIBUTION);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function fetchProfiles() {
  return apiClient.get<Array<any>>(ROUTES.API.ADMIN.PROFILES);
}

export async function getAuditLogs(limit = 200) {
  return apiClient.get<Array<any>>(ROUTES.API.ADMIN.AUDIT_LOGS(limit));
}

export async function getProfilesByIds(ids: string[]) {
  if (ids.length === 0) return [] as Array<any>;
  return apiClient.get<Array<any>>(ROUTES.API.ADMIN.PROFILES_BY_IDS(ids.join(',')));
}
