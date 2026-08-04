"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormEditor } from '@/components/admin/form-editor';
import { Input } from '@/components/ui/input';
import { createComic } from '@/lib/actions/comic.actions';

export default function AdminNewComicPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await createComic({ title, author, description, status: 'ongoing' });
    if (res.success) {
      router.push('/admin/comics');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <FormEditor title="Tạo Truyện Mới" onSubmit={handleSubmit} isSubmitting={isSubmitting}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tên Truyện</label>
            <Input
              type="text"
              placeholder="Nhập tên truyện..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tác Giả</label>
            <Input
              type="text"
              placeholder="Tên tác giả..."
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mô Tả</label>
            <textarea
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={4}
              placeholder="Nhập mô tả chi tiết..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </FormEditor>
    </div>
  );
}
