import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserBookmarksPageContent } from '@/components/user/UserBookmarksPageContent';
import { ROUTES } from '@/lib/constants/routes';

const state = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: state.push }),
}));

vi.mock('@/hooks/features/useBookmarks', () => ({
  useBookmarks: vi.fn().mockReturnValue({
    bookmarks: ['story-1', 'story-2'],
    isLoading: false,
    removeBookmark: vi.fn(),
  }),
}));

vi.mock('@/services/comics/story.service', () => ({
  fetchStoriesByIds: vi.fn().mockResolvedValue([{
    id: 'story-1',
    title: 'Test Comic Title',
    author: 'Test Author',
    cover_url: 'https://example.com/cover.jpg',
    status: 'published',
    updated_at: '2025-08-01T00:00:00Z',
    description: '',
    category: [],
    views: 100,
    created_at: '2025-01-01T00:00:00Z',
  }]),
}));

vi.mock('@/services/comics/comicCms.service', () => ({
  proxiedR2ImageUrl: (url: string) => url,
}));

vi.mock('@/context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'EN',
    setLanguage: () => {},
  }),
}));

vi.mock('@/lib/utils/status-styles', () => ({
  getStatusStyles: () => 'bg-green-100 text-green-700',
  getVietnameseStatus: () => 'Published',
}));

vi.mock('@/lib/utils/image-url', () => ({
  applyComicCoverFallback: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
};

describe('UserBookmarksPageContent', () => {
  it('renders real story title and author', async () => {
    render(<UserBookmarksPageContent />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Test Comic Title')).toBeInTheDocument();
    });
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('renders cover image with correct src', async () => {
    render(<UserBookmarksPageContent />, { wrapper: createWrapper() });
    await waitFor(() => {
      const img = screen.getByAltText('Test Comic Title');
      expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
    });
  });

  it('shows bookmark count in heading', async () => {
    render(<UserBookmarksPageContent />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/bookmarks_title/)).toBeInTheDocument();
    });
  });

  it('renders link to comic detail page', async () => {
    render(<UserBookmarksPageContent />, { wrapper: createWrapper() });
    await waitFor(() => {
      const links = screen.getAllByRole('link');
      const comicLink = links.find(l => l.getAttribute('href') === ROUTES.COMIC_DETAIL('story-1'));
      expect(comicLink).toBeDefined();
    });
  });

  it('shows unfollow button for each comic', async () => {
    render(<UserBookmarksPageContent />, { wrapper: createWrapper() });
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /bookmarks_unfollow/ });
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});

describe('UserBookmarksPageContent empty state', () => {
  it('shows empty state when no bookmarks', async () => {
    const { useBookmarks } = await import('@/hooks/features/useBookmarks');
    vi.mocked(useBookmarks).mockReturnValue({
      bookmarks: [],
      isLoading: false,
      removeBookmark: vi.fn(),
      isBookmarked: () => false,
      addBookmark: vi.fn(),
      toggleBookmark: vi.fn(),
      isToggling: false,
    });

    render(<UserBookmarksPageContent />, { wrapper: createWrapper() });
    expect(screen.getByText('bookmarks_empty_title')).toBeInTheDocument();
    expect(screen.getByText('bookmarks_empty_description')).toBeInTheDocument();
  });

  it('shows explore CTA linking to comics page', async () => {
    const { useBookmarks } = await import('@/hooks/features/useBookmarks');
    vi.mocked(useBookmarks).mockReturnValue({
      bookmarks: [],
      isLoading: false,
      removeBookmark: vi.fn(),
      isBookmarked: () => false,
      addBookmark: vi.fn(),
      toggleBookmark: vi.fn(),
      isToggling: false,
    });

    render(<UserBookmarksPageContent />, { wrapper: createWrapper() });
    const cta = screen.getByRole('link', { name: /bookmarks_empty_cta/ });
    expect(cta).toHaveAttribute('href', ROUTES.COMICS);
  });
});
