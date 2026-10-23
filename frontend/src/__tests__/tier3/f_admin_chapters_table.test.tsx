import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminChaptersTable, ChapterRow } from '@/components/admin/chapters/AdminChaptersTable';

describe('AdminChaptersTable Component (TDD)', () => {
  const mockChapters: ChapterRow[] = [
    {
      id: 'ch-1',
      story_id: 'story-1',
      chapter_number: 1,
      title: 'Khởi đầu mới',
      created_at: '2026-01-15T08:00:00Z',
      images: ['p1.webp', 'p2.webp', 'p3.webp'],
    },
    {
      id: 'ch-2',
      story_id: 'story-1',
      chapter_number: 2,
      title: 'Đột phá',
      created_at: '2026-01-20T08:00:00Z',
      images: ['p1.webp', 'p2.webp'],
    },
  ];

  const mockComics = [
    { id: 'story-1', title: 'Đấu La Đại Lục' },
    { id: 'story-2', title: 'Võ Luyện Đỉnh Phong' },
  ];

  it('renders chapter data in table rows with chapter numbers, titles, and image counts', () => {
    render(
      <AdminChaptersTable
        chapters={mockChapters}
        onEditChapter={() => {}}
        onDeleteChapter={() => {}}
      />
    );

    expect(screen.getByText(/Chapter 1/i)).toBeInTheDocument();
    expect(screen.getByText('Khởi đầu mới')).toBeInTheDocument();
    expect(screen.getByText(/3 trang ảnh/i)).toBeInTheDocument();

    expect(screen.getByText(/Chapter 2/i)).toBeInTheDocument();
    expect(screen.getByText('Đột phá')).toBeInTheDocument();
    expect(screen.getByText(/2 trang ảnh/i)).toBeInTheDocument();
  });

  it('renders search input and comic selector in the filter bar', () => {
    const onSearchChange = vi.fn();
    const onSelectComic = vi.fn();

    render(
      <AdminChaptersTable
        chapters={mockChapters}
        comics={mockComics}
        selectedComicId="story-1"
        onSelectComic={onSelectComic}
        searchValue="Đột phá"
        onSearchChange={onSearchChange}
        onEditChapter={() => {}}
        onDeleteChapter={() => {}}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm số chương, tên chương/i);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue('Đột phá');

    fireEvent.change(searchInput, { target: { value: 'Khởi đầu' } });
    expect(onSearchChange).toHaveBeenCalledWith('Khởi đầu');
  });

  it('calls onEditChapter with the clicked chapter object', () => {
    const onEditChapter = vi.fn();

    render(
      <AdminChaptersTable
        chapters={mockChapters}
        onEditChapter={onEditChapter}
        onDeleteChapter={() => {}}
      />
    );

    const editButtons = screen.getAllByRole('button', { name: /sửa chương/i });
    expect(editButtons.length).toBeGreaterThan(0);

    fireEvent.click(editButtons[0]);
    expect(onEditChapter).toHaveBeenCalledWith(mockChapters[0]);
  });

  it('calls onDeleteChapter with chapter id, chapter number, and story id', () => {
    const onDeleteChapter = vi.fn();

    render(
      <AdminChaptersTable
        chapters={mockChapters}
        onEditChapter={() => {}}
        onDeleteChapter={onDeleteChapter}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /xóa chương/i });
    expect(deleteButtons.length).toBeGreaterThan(0);

    fireEvent.click(deleteButtons[0]);
    expect(onDeleteChapter).toHaveBeenCalledWith('ch-1', 1, 'story-1');
  });

  it('displays empty message when chapters array is empty', () => {
    render(
      <AdminChaptersTable
        chapters={[]}
        onEditChapter={() => {}}
        onDeleteChapter={() => {}}
      />
    );

    expect(screen.getByText(/Chưa có chương nào cho bộ truyện này/i)).toBeInTheDocument();
  });
});
