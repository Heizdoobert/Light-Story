import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../core/supabase';

type AccessLog = {
  id: string;
  actor_user_id: string | null;
  action: 'dashboard_access';
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
};

export const DashboardAccessLogsTab: React.FC = () => {
  const logsQuery = useQuery({
    queryKey: ['dashboard_access_logs'],
    refetchInterval: 10_000,
    queryFn: async () => {
      if (!supabase) return [] as AccessLog[];

      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('id, actor_user_id, action, metadata, created_at')
        .eq('action', 'dashboard_access')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data ?? []) as AccessLog[];
    },
  });

  const actorIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of logsQuery.data ?? []) {
      if (row.actor_user_id) ids.add(row.actor_user_id);
    }
    return Array.from(ids);
  }, [logsQuery.data]);

  const actorsQuery = useQuery({
    queryKey: ['dashboard_access_log_actors', actorIds],
    enabled: actorIds.length > 0,
    queryFn: async () => {
      if (!supabase || actorIds.length === 0) return [] as ProfileRow[];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', actorIds);

      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const actorMap = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    for (const row of actorsQuery.data ?? []) {
      map.set(row.id, row);
    }
    return map;
  }, [actorsQuery.data]);

  const isLoading = logsQuery.isLoading || actorsQuery.isLoading;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard Access Logs</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Server logs for who accessed the admin dashboard and when.</p>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Recent Access Events</h2>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auto refresh 10s</span>
        </div>

        {isLoading && <div className="p-6 text-sm text-slate-500">Loading dashboard access logs...</div>}

        {!isLoading && (logsQuery.data?.length ?? 0) === 0 && (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">No dashboard access logs recorded yet.</div>
        )}

        {!isLoading && (logsQuery.data?.length ?? 0) > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Time (UTC)</th>
                  <th className="px-6 py-3 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Account</th>
                  <th className="px-6 py-3 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(logsQuery.data ?? []).map((log) => {
                  const actor = log.actor_user_id ? actorMap.get(log.actor_user_id) : null;
                  const actorDisplay = actor?.full_name?.trim() || actor?.email || log.actor_user_id || 'Unknown';
                  const page = typeof log.metadata?.page === 'string' ? log.metadata.page : '/admin';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{new Date(log.created_at).toISOString()}</td>
                      <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{actorDisplay}</td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-300">Accessed {page}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
