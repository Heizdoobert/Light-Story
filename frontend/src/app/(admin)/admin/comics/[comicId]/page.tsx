"use client";

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormEditor } from '@/components/admin/form-editor';
import { Input } from '@/components/ui/input';
import { updateComic } from '@/lib/actions/comic.actions';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AdminEditComicPage({ params }: { params: Promise<{ comicId: string }> }) {
  const { comicId } = use(params);
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadComic() {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.from('stories').select('*').eq('id', comicId).maybeSingle();
      if (data) {
        setTitle(data.title || '');
        setAuthor(data.author || '');
        setDescription(data.description || '');
      }
    }
    loadComic();
  }, [comicId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await updateComic(comicId, { title, author, description });
    if (res.success) {
      router.push('/admin/comics');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <FormEditor title="Chỉnh Sửa Thông Tin Truyện" onSubmit={handleSubmit} isSubmitting={isSubmitting}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tên Truyện</label>
            <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tác Giả</label>
            <Input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mô Tả</label>
            <textarea
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </FormEditor>
    </div>
  );
}
