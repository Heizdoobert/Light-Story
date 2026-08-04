"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface ComicRow {
  id: string;
  title: string;
  author: string;
  status: string;
  created_at: string;
}

export default function AdminComicsPage() {
  const [comics, setComics] = useState<ComicRow[]>([]);

  useEffect(() => {
    async function loadComics() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.from('stories').select('id, title, author, status, created_at').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          setComics(data as ComicRow[]);
        } else {
          setComics([
            { id: '1', title: 'Võ Luyện Đỉnh Phong', author: 'Phong Lăng', status: 'ongoing', created_at: new Date().toISOString() },
            { id: '2', title: 'Đấu La Đại Lục', author: 'Đường Gia Tam Thiếu', status: 'completed', created_at: new Date().toISOString() },
          ]);
        }
      } catch (err) {
        console.error('Failed to load admin comics:', err);
      }
    }
    loadComics();
  }, []);

  const columns: Column<ComicRow>[] = [
    { key: 'title', header: 'Tên Truyện', render: (item) => <span className="font-bold">{item.title}</span> },
    { key: 'author', header: 'Tác Giả' },
    {
      key: 'status',
      header: 'Trạng Thái',
      render: (item) => (
        <Badge variant={item.status === 'completed' ? 'success' : 'default'}>{item.status}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Thao Tác',
      render: (item) => (
        <div className="flex gap-2">
          <Link href={`/admin/comics/${item.id}`}>
            <Button size="sm" variant="outline"><Edit size={14} /></Button>
          </Link>
          <Button size="sm" variant="danger"><Trash2 size={14} /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Quản Lý Truyện</h1>
          <p className="text-sm text-slate-500 mt-1">Danh sách tất cả các bộ truyện trong hệ thống</p>
        </div>
        <Link href="/admin/comics/new">
          <Button className="gap-2">
            <Plus size={16} /> Thêm Truyện Mới
          </Button>
        </Link>
      </div>

      <DataTable columns={columns} data={comics} />
    </div>
  );
}
