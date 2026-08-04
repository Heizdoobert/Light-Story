"use client";

import { useEffect, useState } from 'react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface UserRow {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    async function loadUsers() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.from('profiles').select('id, email, role, created_at');
        if (data && data.length > 0) {
          setUsers(data as UserRow[]);
        } else {
          setUsers([
            { id: '1', email: 'admin@lightstory.org', role: 'superadmin', created_at: new Date().toISOString() },
            { id: '2', email: 'user@gmail.com', role: 'user', created_at: new Date().toISOString() },
          ]);
        }
      } catch (err) {
        console.error('Failed to load admin users:', err);
      }
    }
    loadUsers();
  }, []);

  const columns: Column<UserRow>[] = [
    { key: 'email', header: 'Email', render: (item) => <span className="font-bold">{item.email}</span> },
    {
      key: 'role',
      header: 'Vai Trò',
      render: (item) => (
        <Badge variant={item.role === 'superadmin' ? 'danger' : item.role === 'admin' ? 'warning' : 'default'}>
          {item.role}
        </Badge>
      ),
    },
    { key: 'created_at', header: 'Ngày Tham Gia' },
    {
      key: 'actions',
      header: 'Thao Tác',
      render: (item) => (
        <Button size="sm" variant="outline" disabled={item.role === 'superadmin'}>
          Phân Quyền
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Quản Lý Người Dùng</h1>
        <p className="text-sm text-slate-500 mt-1">Phân quyền tài khoản và theo dõi danh sách người dùng</p>
      </div>

      <DataTable columns={columns} data={users} />
    </div>
  );
}
