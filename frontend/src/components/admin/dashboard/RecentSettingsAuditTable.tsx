"use client";

import type { SettingChange } from "@/hooks/presenters/useAdminDashboardPresenter";

interface RecentSettingsAuditTableProps {
  logs: SettingChange[];
  t: (key: string, fallback?: string) => string;
}

export function RecentSettingsAuditTable({ logs, t }: RecentSettingsAuditTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="p-3">Người chỉnh sửa</th>
            <th className="p-3">Hành động</th>
            <th className="p-3">Thời gian</th>
            <th className="p-3">Cài đặt thay đổi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
          {logs.length > 0 ? (
            logs.map((log) => {
              const actor = log.actor_name || log.actor_email || "Hệ thống";
              const keys = Array.isArray(log.metadata?.keys)
                ? (log.metadata.keys as string[])
                : [];

              return (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {actor}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    <span className="uppercase text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded">
                      {log.action || "UPDATE"}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                    {keys.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {keys.map((k) => (
                          <span
                            key={k}
                            className="bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px] text-cyan-600 dark:text-cyan-400"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={4} className="p-4 text-center text-slate-500 dark:text-slate-400">
                {t("dash_settings_log_empty", "Chưa có nhật ký thay đổi cài đặt gần đây")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
