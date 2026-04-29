import { supabase } from '@/lib/supabase/client';
import { SupabaseStoryRepository } from '@/services/repositories/SupabaseStoryRepository';
import { SystemSettingsSnapshotDto } from '@/types/dto';

const storyRepo = new SupabaseStoryRepository();

export async function logDashboardAccess(actorUserId: string) {
  try {
    await fetch('/api/internal/admin/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor_user_id: actorUserId, action: 'dashboard_access', metadata: { page: '/admin' } }),
    });
  } catch (e) {
    // best-effort logging
  }
}

export async function getDashboardData() {
  const res = await fetch('/api/internal/admin/dashboard');
  if (!res.ok) return { stories: [], stats: { totalViews: 0, activeStories: 0, totalChapters: 0 }, syncedAt: new Date().toISOString() };
  return res.json();
}

export async function getUiSettings() {
  const res = await fetch('/api/site-settings');
  if (!res.ok) return { compactMode: false, showSyncBadge: true };
  const json = await res.json();
  const map = new Map((json.data ?? []).map((item: any) => [item.key, item.value]));
  return {
    compactMode: map.get('ui_compact_mode') === 'true',
    showSyncBadge: map.get('ui_show_sync_badge') !== 'false',
  };
}

export async function getStoriesFieldValues(field: 'category_id' | 'author_id') {
  const res = await fetch(`/api/stories/field?name=${encodeURIComponent(field)}`);
  if (!res.ok) return [] as Array<Record<string, string | null>>;
  const json = await res.json();
  return json.data as Array<Record<string, string | null>>;
}

export async function getProfileCount() {
  const res = await fetch('/api/site-metrics?type=profiles');
  if (!res.ok) return 0;
  const json = await res.json();
  return json.count ?? 0;
}

export async function getChapterCount() {
  const res = await fetch('/api/site-metrics?type=chapters');
  if (!res.ok) return 0;
  const json = await res.json();
  return json.count ?? 0;
}

export async function getAdSettingsCount() {
  const res = await fetch('/api/site-settings');
  if (!res.ok) return 0;
  const json = await res.json();
  return (json.data ?? []).length;
}

export async function getRoleDistribution() {
  const res = await fetch('/api/role-distribution');
  if (!res.ok) return [] as Array<{ role: string; total: number }>;
  const json = await res.json();
  return json.data as Array<{ role: string; total: number }>;
}

export default {};

export async function fetchProfiles() {
  const res = await fetch('/api/internal/admin/profiles');
  if (!res.ok) return [] as Array<any>;
  const json = await res.json();
  return json.data as Array<any>;
}

export async function updateProfileRole(id: string, role: string) {
  const res = await fetch('/api/internal/admin/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateRole', id, role }),
  });
  if (!res.ok) throw new Error('Request failed');
}

export async function updateProfileName(id: string, full_name: string | null) {
  const res = await fetch('/api/internal/admin/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateName', id, full_name }),
  });
  if (!res.ok) throw new Error('Request failed');
}

export async function callManageUserFunction(body: Record<string, unknown>) {
  if (!supabase) throw new Error('Supabase client unavailable');

  // Use internal server route which will perform server-side auth & role checks
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Session expired');

  const response = await fetch('/api/internal/admin/manage-user', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({ raw: '' }));
  if (!response.ok) {
    return { data: json, error: new Error(json?.error ?? `Request failed ${response.status}`) };
  }
  return { data: json, error: null } as { data: any; error: any };
}

export async function getAuditLogs(limit = 200) {
  const res = await fetch(`/api/internal/admin/audit?limit=${limit}`);
  if (!res.ok) return [] as Array<any>;
  const json = await res.json();
  return json.data as Array<any>;
}

export async function getProfilesByIds(ids: string[]) {
  if (ids.length === 0) return [] as Array<any>;
  const res = await fetch(`/api/internal/admin/profiles?ids=${encodeURIComponent(ids.join(','))}`);
  if (!res.ok) return [] as Array<any>;
  const json = await res.json();
  return json.data as Array<any>;
}
