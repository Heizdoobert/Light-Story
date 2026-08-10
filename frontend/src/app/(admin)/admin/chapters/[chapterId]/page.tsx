"use client";

import { use, useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { FormEditor } from '@/components/admin/form-editor';
import { Input } from '@/components/ui/input';
import { updateChapter } from '@/lib/actions/chapter.actions';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const ImageUploader = dynamic(() => import('@/components/admin/image-uploader'), {
  ssr: false,
});

interface ChapterRow {
  story_id: string;
  chapter_number: number;
  title: string;
  images: string[] | null;
}

export default function AdminEditChapterPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = use(params);
  const [chapterNumber, setChapterNumber] = useState('');
  const [title, setTitle] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [storyId, setStoryId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadChapter = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('chapters')
        .select('story_id, chapter_number, title, images')
        .eq('id', chapterId)
        .maybeSingle();
      if (error || !data) {
        setLoadError(error?.message || 'Không tìm thấy chương');
        return;
      }
      const chapter = data as ChapterRow;
      setStoryId(chapter.story_id);
      setChapterNumber(String(chapter.chapter_number ?? 1));
      setTitle(chapter.title ?? '');
      setImages(Array.isArray(chapter.images) ? chapter.images : []);
    } catch (err) {
      setLoadError((err as Error).message || 'Không thể tải chương');
    } finally {
      setIsLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    loadChapter();
  }, [loadChapter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyId) return;
    setIsSubmitting(true);
    try {
      const res = await updateChapter(chapterId, storyId, {
        chapter_number: Number(chapterNumber),
        title,
        images,
      });
      if (res.success === false) {
        toast.error(res.error);
        return;
      }
      toast.success('Lưu chương thành công');
    } catch (err) {
      toast.error((err as Error).message || 'Không thể lưu chương');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="max-w-4xl mx-auto py-6 text-sm text-slate-500">Đang tải chương...</div>;
  }

  if (loadError || !storyId) {
    return (
      <div className="max-w-4xl mx-auto py-6 space-y-4">
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 text-sm text-rose-700 dark:text-rose-300">
          {loadError || 'Không tìm thấy chương'}
        </div>
        <button
          type="button"
          onClick={loadChapter}
          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-sm font-bold text-white"
        >
          Thử Lại
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      <FormEditor title="Chỉnh Sửa Chương & Tệp Ảnh" onSubmit={handleSubmit} isSubmitting={isSubmitting}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Số Chương</label>
            <Input type="number" value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tên Chương</label>
            <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>
      </FormEditor>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Tải Lên Ảnh Chương (Kéo Thả)</h2>
        <ImageUploader
          folder={`chapters/${chapterId}`}
          onImagesUploaded={(urls) => {
            setImages((prev) => [...prev, ...urls]);
          }}
        />
        <p className="text-xs text-slate-500">Đã chọn: {images.length} trang ảnh</p>
      </div>
    </div>
  );
}
