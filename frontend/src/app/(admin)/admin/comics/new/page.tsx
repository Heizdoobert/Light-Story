"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormEditor } from '@/components/admin/form-editor';
import { Input } from '@/components/ui/input';
import { createComic } from '@/lib/actions/comic.actions';
import { COMIC_STATUSES } from '@/lib/schemas/comic';
import { ROUTES } from '@/lib/constants/routes';

export default function AdminNewComicPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('ongoing');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await createComic({
        title,
        author,
        description,
        status: status as (typeof COMIC_STATUSES)[number],
      });
      if (res.success) {
        toast.success('Tạo truyện thành công');
        router.push(ROUTES.ADMIN.COMICS);
        return;
      }
      toast.error(res.error || 'Tạo truyện thất bại');
    } catch (err) {
      toast.error((err as Error).message || 'Tạo truyện thất bại');
    } finally {
      setIsSubmitting(false);
    }
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
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Trạng Thái</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {COMIC_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
