"use client";

import { useEffect, useState } from 'react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface AuditLogRow {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAuditLogs() {
      setIsLoading(true);
      setError(null);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: err } = await supabase
          .from('audit_logs')
          .select('id, action, entity_type, created_at')
          .order('created_at', { ascending: false });
        if (err) throw err;
        setLogs((data ?? []) as AuditLogRow[]);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
        setError('Không thể tải nhật ký hoạt động');
      } finally {
        setIsLoading(false);
      }
    }
    loadAuditLogs();
  }, []);

  const columns: Column<AuditLogRow>[] = [
    { key: 'action', header: 'Hành Động', render: (item) => <Badge variant="info">{item.action}</Badge> },
    { key: 'entity_type', header: 'Loại Thực Thể' },
    { key: 'created_at', header: 'Thời Gian' },
  ];

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
        <DataTable columns={columns} data={logs} />
      )}
    </div>
  );
}
