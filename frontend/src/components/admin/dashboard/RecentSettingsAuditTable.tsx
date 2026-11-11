"use client";

import { useMemo } from "react";
import { AdminTable, Tag, type TableColumnsType } from "@light-story/ui";
import type { SettingChange } from "@/hooks/presenters/useAdminDashboardPresenter";

interface RecentSettingsAuditTableProps {
  logs: SettingChange[];
  t: (key: string, fallback?: string) => string;
  loading?: boolean;
}

export function RecentSettingsAuditTable({ logs, t, loading = false }: RecentSettingsAuditTableProps) {
  const columns: TableColumnsType<SettingChange> = useMemo(
    () => [
      {
        title: "Người chỉnh sửa",
        key: "actor",
        width: 200,
        render: (_, record) => {
          const actor = record.actor_name || record.actor_email || "Hệ thống";
          return (
            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-900 dark:text-slate-100 font-semibold">
              {actor}
            </span>
          );
        },
      },
      {
        title: "Hành động",
        key: "action",
        width: 120,
        render: (_, record) => (
          <Tag color="orange" className="uppercase font-bold text-[10px]">
            {record.action || "UPDATE"}
          </Tag>
        ),
      },
      {
        title: "Thời gian",
        dataIndex: "created_at",
        key: "created_at",
        width: 180,
        render: (created_at: string) => (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {new Date(created_at).toLocaleString()}
          </span>
        ),
      },
      {
        title: "Cài đặt thay đổi",
        key: "keys",
        render: (_, record) => {
          const keys = Array.isArray(record.metadata?.keys)
            ? (record.metadata.keys as string[])
            : [];
          if (keys.length === 0) return <span className="text-slate-400">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {keys.map((k) => (
                <span
                  key={k}
                  className="bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px] text-cyan-600 dark:text-cyan-400 font-mono"
                >
                  {k}
                </span>
              ))}
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <AdminTable<SettingChange>
      columns={columns}
      dataSource={logs}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 5, showSizeChanger: false }}
      emptyText={t("dash_settings_log_empty", "Chưa có nhật ký thay đổi cài đặt gần đây")}
    />
  );
}
