"use client";

import { use, useState } from 'react';
import dynamic from 'next/dynamic';
import { FormEditor } from '@/components/admin/form-editor';
import { Input } from '@/components/ui/input';
import { updateChapter } from '@/lib/actions/chapter.actions';

const ImageUploader = dynamic(() => import('@/components/admin/image-uploader'), {
  ssr: false,
});

export default function AdminEditChapterPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = use(params);
  const [chapterNumber, setChapterNumber] = useState('1');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await updateChapter(chapterId, '1', {
      chapter_number: Number(chapterNumber),
      title,
    });
    setIsSubmitting(false);
  };

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
        <ImageUploader folder={`chapters/${chapterId}`} />
      </div>
    </div>
  );
}
