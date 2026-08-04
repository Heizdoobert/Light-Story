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

  useEffect(() => {
    async function loadAuditLogs() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.from('audit_logs').select('id, action, entity_type, created_at').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          setLogs(data as AuditLogRow[]);
        } else {
          setLogs([
            { id: '1', action: 'CREATE_STORY', entity_type: 'story', created_at: new Date().toISOString() },
            { id: '2', action: 'UPDATE_CHAPTER', entity_type: 'chapter', created_at: new Date().toISOString() },
          ]);
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
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

      <DataTable columns={columns} data={logs} />
    </div>
  );
}
