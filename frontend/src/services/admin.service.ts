import { supabase } from '@/lib/supabase/client';
import { Story } from '@/types/entities';

type DashboardStats = {
  totalViews: number;
  activeStories: number;
  totalChapters: number;
};

type DashboardData = {
  stories: Story[];
  stats: DashboardStats;
  syncedAt: string;
};

function emptyDashboardData(): DashboardData {
  return {
    stories: [],
    stats: { totalViews: 0, activeStories: 0, totalChapters: 0 },
    syncedAt: new Date().toISOString(),
  };
}

export async function logDashboardAccess(actorUserId: string) {
  if (!supabase || !actorUserId) return;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return;

    const response = await fetch('/api/internal/admin/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        actor_user_id: actorUserId,
        action: 'dashboard_access',
        metadata: { page: '/admin' },
      }),
    });

    if (response.status === 401 || response.status === 403) return;
  } catch (e) {
    // best-effort logging
  }
}

export async function getDashboardData() {
  if (!supabase) return emptyDashboardData();

  const [storiesResult, chaptersResult] = await Promise.all([
    supabase
      .from('stories')
      .select('id,title,author,author_id,description,cover_url,category,category_id,status,views,created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('chapters').select('id', { count: 'exact', head: true }),
  ]);

  if (storiesResult.error || chaptersResult.error) return emptyDashboardData();

  const stories = (storiesResult.data ?? []) as Story[];
  const totalViews = stories.reduce((sum, story) => sum + (story.views || 0), 0);
  const activeStories = stories.filter((story) => story.status === 'ongoing').length;

  return {
    stories,
    stats: {
      totalViews,
      activeStories,
      totalChapters: chaptersResult.count ?? 0,
    },
    syncedAt: new Date().toISOString(),
  };
}

export async function getUiSettings() {
  if (!supabase) return { compactMode: false, showSyncBadge: true };

  const { data, error } = await supabase
    .from('site_settings')
    .select('key,value')
    .in('key', ['ui_compact_mode', 'ui_show_sync_badge']);

  if (error) return { compactMode: false, showSyncBadge: true };

  const map = new Map((data ?? []).map((item: any) => [item.key, item.value]));
  return {
    compactMode: map.get('ui_compact_mode') === 'true',
    showSyncBadge: map.get('ui_show_sync_badge') !== 'false',
  };
}

export async function getStoriesFieldValues(field: 'category_id' | 'author_id') {
  if (!supabase) return [] as Array<Record<string, string | null>>;

  const { data, error } = await supabase.from('stories').select(field).limit(1000);
  if (error) return [] as Array<Record<string, string | null>>;
  return (data ?? []) as Array<Record<string, string | null>>;
}

export async function getProfileCount() {
  if (!supabase) return 0;

  const { count, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  if (error) return 0;
  return count ?? 0;
}

export async function getChapterCount() {
  if (!supabase) return 0;

  const { count, error } = await supabase.from('chapters').select('id', { count: 'exact', head: true });
  if (error) return 0;
  return count ?? 0;
}

export async function getAdSettingsCount() {
  if (!supabase) return 0;

  const { count, error } = await supabase.from('site_settings').select('id', { count: 'exact', head: true });
  if (error) return 0;
  return count ?? 0;
}

export async function getRoleDistribution() {
  if (!supabase) return [] as Array<{ role: string; total: number }>;

  const { data, error } = await supabase.from('profiles').select('role');
  if (error) return [] as Array<{ role: string; total: number }>;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const role = ((row as { role?: string | null }).role || 'user').trim();
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([role, total]) => ({ role, total }))
    .sort((a, b) => b.total - a.total);
}

export default {};

export async function fetchProfiles() {
  if (!supabase) return [] as Array<any>;

  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,role,full_name')
    .order('role', { ascending: true })
    .limit(500);
  if (error) return [] as Array<any>;
  return (data ?? []) as Array<any>;
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
  // Use the internal server route first; fall back to the Supabase Edge Function when local
  // service-role configuration is missing or a mock server client is returned.
  let accessToken: string | null = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  try {
    if (supabase) {
      const sessionResult = await supabase.auth.getSession();
      accessToken = sessionResult.data.session?.access_token ?? null;
    }
  } catch {
    accessToken = null;
  }

  const response = await fetch('/api/internal/admin/manage-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({ raw: '' }));
  if (!response.ok) {
    const errorMessage = json?.error ?? `Request failed ${response.status}`;
    const shouldFallbackToEdgeFunction =
      response.status >= 500 &&
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

    return { data: json, error: new Error(errorMessage) };
  }
  return { data: json, error: null };
}

export async function getAuditLogs(limit = 200) {
  if (!supabase) return [] as Array<any>;

  const { data, error } = await supabase
    .from('admin_audit_logs')
    .select('id,actor_user_id,action,target_user_id,target_email,metadata,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [] as Array<any>;
  return (data ?? []) as Array<any>;
}

export async function getProfilesByIds(ids: string[]) {
  if (ids.length === 0) return [] as Array<any>;

  if (!supabase) return [] as Array<any>;

  const { data, error } = await supabase.from('profiles').select('id,email,full_name').in('id', ids);
  if (error) return [] as Array<any>;
  return (data ?? []) as Array<any>;
}
