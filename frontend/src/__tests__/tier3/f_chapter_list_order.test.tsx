import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ComicDetailPageContent } from '@/components/comics/ComicDetailPageContent';
import { ROUTES } from '@/lib/constants/routes';
import type { Chapter } from '@/types/entities';

const state = vi.hoisted(() => ({
  chapters: [] as Chapter[],
  comic: null as unknown,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ comicId: 'c1' }),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: null,
}));

vi.mock('@/services/reader/readerHub.service', () => ({
  getReadingHistory: vi.fn(async () => []),
}));

vi.mock('@/services/comics/chapter.service', () => ({
  fetchChaptersByStoryId: vi.fn(async () => state.chapters),
}));

vi.mock('@/services/comics/story.service', () => ({
  fetchStoryById: vi.fn(async () => state.comic),
}));

vi.mock('@/services/comics/comicCms.service', () => ({
  proxiedR2ImageUrl: (url: string) => url,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/comics/RecommendedComics', () => ({
  RecommendedComics: () => null,
}));

vi.mock('@/components/user/bookmark-button', () => ({
  BookmarkButton: () => null,
}));

vi.mock('motion/react', () => ({
  motion: {
    div: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
    img: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  },
}));

const comicFixture = {
  id: 'c1',
  tenantKey: '',
  storyId: 'c1',
  title: 'Truyện A',
  slug: 'truyen-a',
  description: '',
  author: 'Tác giả A',
  status: 'ongoing',
  category: [],
  viewCount: 0,
  coverUrl: '',
};

const outOfOrderChapters: Chapter[] = [
  { id: 'ch-3', story_id: 'c1', chapter_number: 3, title: '', content: '', status: 'published', created_at: '2026-03-01T00:00:00Z' },
  { id: 'ch-1', story_id: 'c1', chapter_number: 1, title: '', content: '', status: 'published', created_at: '2026-01-01T00:00:00Z' },
  { id: 'ch-2', story_id: 'c1', chapter_number: 2, title: '', content: '', status: 'published', created_at: '2026-06-01T00:00:00Z' },
];

describe('ComicDetailPageContent chapter ordering (regression guard)', () => {
  beforeEach(() => {
    state.chapters = outOfOrderChapters;
    state.comic = comicFixture;
  });

  it('sorts fetched chapters ascending by chapter_number, ignoring upload order', async () => {
    render(<ComicDetailPageContent />);

    await waitFor(() => {
      const labels = screen.getAllByText(/^Chương \d+$/).map((n) => n.textContent);
      expect(labels).toEqual(['Chương 1', 'Chương 2', 'Chương 3']);
    });
  });

  it('Đọc từ đầu links the lowest chapter_number, Đọc mới nhất the highest', async () => {
    render(<ComicDetailPageContent />);

    await waitFor(() => {
      const firstLink = screen.getByText('Đọc từ đầu').closest('a');
      const latestLink = screen.getByText('Đọc mới nhất').closest('a');

      expect(firstLink?.getAttribute('href')).toBe(ROUTES.CHAPTER_READER('c1', 'ch-1'));
      expect(latestLink?.getAttribute('href')).toBe(ROUTES.CHAPTER_READER('c1', 'ch-3'));
    });
  });

  it('server page queries chapters ordered by chapter_number ascending (hydration path)', () => {
    const page = readFileSync(
      path.join(process.cwd(), 'src/app/(public)/comics/[comicId]/page.tsx'),
      'utf8',
    );
    expect(page).toContain(".order('chapter_number', { ascending: true })");
    expect(page).not.toContain(".order('created_at', { ascending: false })");
  });
});
