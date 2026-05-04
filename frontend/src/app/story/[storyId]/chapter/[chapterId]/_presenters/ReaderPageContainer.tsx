'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ReaderPage } from '../_components/ReaderPage';
import { IReaderView } from '@/presentation/mvp/ReaderContract';
import { ReaderPresenter } from '@/presentation/mvp/ReaderPresenter';
import { SupabaseStoryRepository } from '@/infrastructure/repositories/SupabaseStoryRepository';
import { SupabaseChapterRepository } from '@/infrastructure/repositories/SupabaseChapterRepository';
import { Chapter } from '@/types/entities';

interface ReaderPageContainerProps {
  storyId: string;
  chapterId: string;
}

export const ReaderPageContainer: React.FC<ReaderPageContainerProps> = ({ storyId, chapterId }) => {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [storyMeta, setStoryMeta] = useState<{ title: string; description: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [theme, setTheme] = useState('light');

  const presenter = useMemo(() => {
    const storyRepo = new SupabaseStoryRepository();
    const chapterRepo = new SupabaseChapterRepository();
    return new ReaderPresenter(storyRepo, chapterRepo);
  }, []);

  useEffect(() => {
    const view: IReaderView = {
      showLoading: () => setLoading(true),
      hideLoading: () => setLoading(false),
      displayChapter: (data) => setChapter(data),
      displayStoryMetadata: (title, description) => setStoryMeta({ title, description }),
      showError: (msg) => setError(msg),
    };

    presenter.attachView(view);
    if (storyId && chapterId) {
      presenter.loadChapterData(storyId, chapterId);
    }

    return () => presenter.detachView();
  }, [presenter, storyId, chapterId]);

  useEffect(() => {
    const title = `${chapter?.title ?? 'Loading...'} - ${storyMeta?.title || 'Light Story'}`;
    document.title = title;

    const description =
      storyMeta?.description ||
      (chapter ? `Read chapter ${chapter.chapter_number} of ${storyMeta?.title || 'this story'}` : 'Read stories on Light Story');
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
  }, [chapter, storyMeta]);

  return (
    <ReaderPage
      chapter={chapter}
      loading={loading}
      error={error}
      fontSize={fontSize}
      theme={theme}
      onDecrementFontSize={() => setFontSize((size) => Math.max(12, size - 2))}
      onIncrementFontSize={() => setFontSize((size) => Math.min(32, size + 2))}
      onThemeChange={setTheme}
    />
  );
};