import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminDescriptionsPage from '@/app/(admin)/admin/descriptions/page';

const state = vi.hoisted(() => ({
  comics: [
    { id: '1', title: 'One Piece', author: 'Oda', description: 'Pirate adventure', status: 'published', views: 1000, created_at: '2024-01-01' },
    { id: '2', title: 'Naruto', author: 'Kishimoto', description: '', status: 'completed', views: 500, created_at: '2024-01-01' },
  ],
  search: '',
  setSearch: vi.fn(),
  loading: false,
  updateComic: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/hooks/features/use-admin-comics', () => ({
  useAdminComics: () => ({
    comics: state.comics,
    loading: state.loading,
    search: state.search,
    setSearch: state.setSearch,
  }),
}));

vi.mock('@/lib/actions/comic.actions', () => ({
  updateComic: (...args: unknown[]) => state.updateComic(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('Admin Descriptions Page', () => {
  it('renders comic list', () => {
    render(<AdminDescriptionsPage />);
    expect(screen.getByText('One Piece')).toBeDefined();
    expect(screen.getByText('Naruto')).toBeDefined();
  });

  it('shows empty state when no comic selected', () => {
    render(<AdminDescriptionsPage />);
    expect(screen.getByText('Chọn một truyện bên trái để chỉnh sửa mô tả')).toBeDefined();
  });

  it('loads description into textarea when comic clicked', () => {
    render(<AdminDescriptionsPage />);
    fireEvent.click(screen.getByText('One Piece'));
    const textarea = screen.getByPlaceholderText('Nhập mô tả chi tiết cho bộ truyện...') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Pirate adventure');
  });

  it('shows empty description as blank textarea for comic without description', () => {
    render(<AdminDescriptionsPage />);
    fireEvent.click(screen.getByText('Naruto'));
    const textarea = screen.getByPlaceholderText('Nhập mô tả chi tiết cho bộ truyện...') as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
  });

  it('calls updateComic on save', async () => {
    render(<AdminDescriptionsPage />);
    fireEvent.click(screen.getByText('One Piece'));
    fireEvent.click(screen.getByText('Lưu Mô Tả'));
    expect(state.updateComic).toHaveBeenCalledWith('1', { description: 'Pirate adventure' });
  });
});
