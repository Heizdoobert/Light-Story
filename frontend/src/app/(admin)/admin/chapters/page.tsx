"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Edit, Trash2 } from 'lucide-react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface ChapterRow {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  created_at: string;
}

export default function AdminChaptersPage() {
  const [chapters, setChapters] = useState<ChapterRow[]>([]);

  useEffect(() => {
    async function loadChapters() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.from('chapters').select('id, story_id, chapter_number, title, created_at').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          setChapters(data as ChapterRow[]);
        } else {
          setChapters([
            { id: 'ch1', story_id: '1', chapter_number: 1, title: 'Chương mở đầu', created_at: new Date().toISOString() },
          ]);
        }
      } catch (err) {
        console.error('Failed to load admin chapters:', err);
      }
    }
    loadChapters();
  }, []);

  const columns: Column<ChapterRow>[] = [
    { key: 'chapter_number', header: 'Số Chương', render: (item) => <span className="font-bold">Chapter {item.chapter_number}</span> },
    { key: 'title', header: 'Tên Chương' },
    { key: 'created_at', header: 'Ngày Tạo' },
    {
      key: 'actions',
      header: 'Thao Tác',
      render: (item) => (
        <div className="flex gap-2">
          <Link href={`/admin/chapters/${item.id}`}>
            <Button size="sm" variant="outline"><Edit size={14} /></Button>
          </Link>
          <Button size="sm" variant="danger"><Trash2 size={14} /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Quản Lý Các Chương</h1>
        <p className="text-sm text-slate-500 mt-1">Quản lý và cập nhật nội dung các chương truyện</p>
      </div>

      <DataTable columns={columns} data={chapters} />
    </div>
  );
}
