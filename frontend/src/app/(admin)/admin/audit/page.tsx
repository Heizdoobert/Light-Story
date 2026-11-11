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

  const getActionBadge = (action: string) => {
    if (!action) return <Badge variant="default">Không xác định</Badge>;
    const lower = action.toLowerCase();
    if (lower.includes('create') || lower.includes('add')) {
      return <Badge variant="success">Tạo mới ({action})</Badge>;
    }
    if (lower.includes('delete') || lower.includes('remove')) {
      return <Badge variant="danger">Xóa ({action})</Badge>;
    }
    if (lower.includes('update') || lower.includes('edit') || lower.includes('settings')) {
      return <Badge variant="warning">Cập nhật ({action})</Badge>;
    }
    if (lower.includes('dashboard') || lower.includes('access') || lower.includes('read')) {
      return <Badge variant="info">Truy cập ({action})</Badge>;
    }
    return <Badge variant="default">{action}</Badge>;
  };

  const formatTimestamp = (raw: string) => {
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return (
      <div className="flex flex-col text-xs leading-tight">
        <span className="font-bold text-slate-800 dark:text-slate-200">
          {d.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          {d.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      </div>
    );
  };

  const columns: Column<AuditLogRow>[] = [
    {
      key: 'action',
      header: 'Hành Động',
      render: (item) => getActionBadge(item.action),
    },
    {
      key: 'target_email',
      header: 'Email Mục Tiêu / Người Thao Tác',
      render: (item) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
          {item.target_email && item.target_email !== '—' ? (
            item.target_email
          ) : (
            <span className="text-slate-400 italic">Hệ thống</span>
          )}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Thời Gian',
      render: (item) => formatTimestamp(item.created_at),
    },
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
