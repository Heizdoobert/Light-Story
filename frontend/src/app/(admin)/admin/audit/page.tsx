"use client";

import { useEffect, useState } from 'react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/apiClient';
import { ROUTES } from '@/lib/constants/routes';
import { useRoleGuard } from '@/hooks/common/use-role-guard';

export interface AuditLogRow {
  id: string;
  action: string;
  target_email: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

export default function AdminAuditPage() {
  useRoleGuard(["superadmin"], ROUTES.ADMIN.DASHBOARD);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadAuditLogs() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<{ items: AuditLogRow[]; total: number }>(
          ROUTES.API.ADMIN.AUDIT_LOGS(page, PAGE_SIZE),
        );
        if (cancelled) return;
        setLogs(res?.items ?? []);
        setTotal(res?.total ?? 0);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
        if (!cancelled) setError('Không thể tải nhật ký hoạt động');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadAuditLogs();
    return () => {
      cancelled = true;
    };
  }, [page]);

  const columns: Column<AuditLogRow>[] = [
    { key: 'action', header: 'Hành Động', render: (item) => <Badge variant="info">{item.action}</Badge> },
    { key: 'target_email', header: 'Email Mục Tiêu', render: (item) => item.target_email || '—' },
    { key: 'created_at', header: 'Thời Gian' },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Nhật Ký Hoạt Động (Audit Log)</h1>
        <p className="text-sm text-slate-500 mt-1">Lịch sử các thao tác thay đổi dữ liệu của ban quản trị</p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-500 text-sm">Đang tải nhật ký hoạt động...</div>
      ) : error ? (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-2xl text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={logs} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{total} bản ghi</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
              >
                Trước
              </button>
              <span className="text-sm text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-100 dark:bg-slate-800 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
