import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AdRenderer } from '../components/AdRenderer';
import { IReaderView } from '../presentation/mvp/ReaderContract';
import { ReaderPresenter } from '../presentation/mvp/ReaderPresenter';
import { SupabaseStoryRepository } from '../infrastructure/repositories/SupabaseStoryRepository';
import { SupabaseChapterRepository } from '../infrastructure/repositories/SupabaseChapterRepository';
import { Chapter } from '../domain/entities';

export const ReaderPage: React.FC = () => {
  const { storyId, chapterId } = useParams<{ storyId: string, chapterId: string }>();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [storyMeta, setStoryMeta] = useState<{ title: string, description: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [theme, setTheme] = useState('light');

  // MVP Setup
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
      showError: (msg) => setError(msg)
    };

    presenter.attachView(view);
    if (storyId && chapterId) {
      presenter.loadChapterData(storyId, chapterId);
    }

    return () => presenter.detachView();
  }, [presenter, storyId, chapterId]);

  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return 'bg-slate-950 text-slate-100';
      case 'sepia':
        return 'bg-[#f4ecd8] text-[#5b4636]';
      default:
        return 'bg-slate-50 text-slate-900';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>;
  if (!chapter) return <div className="flex items-center justify-center h-screen">Chapter not found</div>;

  return (
    <div className={`min-h-screen p-8 transition-colors duration-300 ${getThemeClasses()}`}>
      <Helmet>
        <title>{`${chapter.title} - ${storyMeta?.title || 'Loading...'}`}</title>
        <meta name="description" content={storyMeta?.description || `Read chapter ${chapter.chapter_number} of ${storyMeta?.title}`} />
      </Helmet>
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8 glass-panel p-4 rounded-xl border border-slate-200/50 dark:border-white/10">
          <div className="flex gap-4">
            <button onClick={() => setFontSize(s => Math.max(12, s - 2))} className="px-3 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 font-bold transition-colors">A-</button>
            <button onClick={() => setFontSize(s => Math.min(32, s + 2))} className="px-3 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 font-bold transition-colors">A+</button>
          </div>
          <div className="flex gap-2">
            {['light', 'sepia', 'dark'].map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-3 py-1 rounded text-xs font-bold uppercase transition-all ${
                  theme === t ? 'bg-primary text-white scale-105 shadow-sm' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <AdRenderer position="header" />
        <h1 className="text-3xl font-bold">{chapter.title}</h1>
        <div className="mt-4 leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
          {chapter.content}
        </div>
        <AdRenderer position="middle" />
      </div>
    </div>
  );
};
