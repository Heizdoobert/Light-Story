import React from 'react';
import { useAuditLogsPresenter } from '@/hooks/useAuditLogsPresenter';

type AuditAction = 'user_create' | 'user_delete';

const ACTION_LABELS: Record<AuditAction, string> = {
  user_create: 'User Created',
  user_delete: 'User Deleted',
};

export const AdminAuditLogsTab: React.FC = () => {
  const { logsQuery, actorMap, isLoading } = useAuditLogsPresenter();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Admin Audit Logs</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Track sensitive user administration actions (create/delete) by superadmin accounts.</p>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Recent Entries</h2>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auto refresh 10s</span>
        </div>

        {isLoading && <div className="p-6 text-sm text-slate-500">Loading audit logs...</div>}

        {!isLoading && (logsQuery.data?.length ?? 0) === 0 && (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">No audit logs recorded yet.</div>
        )}

        {!isLoading && (logsQuery.data?.length ?? 0) > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Time (UTC)</th>
                  <th className="px-6 py-3 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Action</th>
                  <th className="px-6 py-3 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Actor</th>
                  <th className="px-6 py-3 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Target</th>
                  <th className="px-6 py-3 font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(logsQuery.data ?? []).map((log) => {
                  const actor = log.actor_user_id ? actorMap.get(log.actor_user_id) : null;
                  const actorDisplay = actor?.full_name?.trim() || actor?.email || log.actor_user_id || 'Unknown';
                  const metadataText = log.metadata && Object.keys(log.metadata).length > 0
                    ? JSON.stringify(log.metadata)
                    : '-';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{new Date(log.created_at).toISOString()}</td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {ACTION_LABELS[log.action as keyof typeof ACTION_LABELS] ?? log.action}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{actorDisplay}</td>
                      <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{log.target_email || log.target_user_id || '-'}</td>
                      <td className="px-6 py-3 text-slate-500 dark:text-slate-400 max-w-[420px] truncate" title={metadataText}>{metadataText}</td>
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

