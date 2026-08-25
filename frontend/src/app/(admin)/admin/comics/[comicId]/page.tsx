"use client";

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormEditor } from '@/components/admin/form-editor';
import { Input } from '@/components/ui/input';
import { updateComic } from '@/lib/actions/comic.actions';
import { fetchStoryById } from '@/services/comics/story.service';
import { ROUTES } from '@/lib/constants/routes';

export default function AdminEditComicPage({ params }: { params: Promise<{ comicId: string }> }) {
  const { comicId } = use(params);
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadComic = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const story = await fetchStoryById(comicId);
      if (!story) {
        setError('Không tìm thấy truyện');
        return;
      }
      setTitle(story.title || '');
      setAuthor(story.author || '');
      setDescription(story.description || '');
    } catch (err) {
      setError((err as Error).message || 'Không thể tải thông tin truyện');
    } finally {
      setIsLoading(false);
    }
  }, [comicId]);

  useEffect(() => {
    loadComic();
  }, [loadComic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await updateComic(comicId, { title, author, description });
      if (res.success) {
        toast.success('Lưu truyện thành công');
        router.push(ROUTES.ADMIN.COMICS);
        return;
      }
      toast.error(res.error || 'Lưu truyện thất bại');
    } catch (err) {
      toast.error((err as Error).message || 'Lưu truyện thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-6">
        <p className="text-sm font-semibold animate-pulse">Đang tải thông tin truyện...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-6 text-center space-y-4">
        <p className="text-sm font-semibold text-rose-500">{error}</p>
        <button
          type="button"
          onClick={loadComic}
          className="px-4 py-2 text-sm rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600"
        >
          Thử Lại
        </button>
      </div>
    );
  }

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
