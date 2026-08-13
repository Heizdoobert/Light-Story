import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomePage } from '@/components/comics/HomePage';
import { ProfilePageContent } from '@/components/user/ProfilePageContent';
import { ROUTES } from '@/lib/constants/routes';
import type { ComicContext as Comic } from '@/services/comics/comic.service';
import type { Chapter } from '@/types/entities';

const state = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: state.push }),
}));

const comic: Comic = {
  id: 'c1',
  storyId: 'c1',
  tenantKey: '',
  slug: '',
  title: 'Spotlight Comic',
  description: '',
  author: 'Test Author',
  status: 'ongoing',
  category: ['Action'],
  viewCount: 10,
  coverUrl: '',
  createdAt: undefined,
  updatedAt: undefined,
};

const chapter: Chapter = {
  id: 'ch1',
  story_id: 'c1',
  chapter_number: 5,
  title: 'Chapter Five',
} as Chapter;

vi.mock('@/components/reader/AdRenderer', () => ({ AdRenderer: () => null }));
vi.mock('@/components/shared/ads/AdZone', () => ({ AdZone: () => null }));

vi.mock('@/hooks/presenters/useHomePagePresenter', () => ({
  useHomePagePresenter: () => ({
    t: (key: string) => key,
    comics: [comic],
    latestChapters: { c1: chapter },
    trendingComics: [comic],
    trendingLoaded: true,
    loading: false,
    historyComics: [],
    getComicCover: () => 'https://example.com/cover.jpg',
    applyComicCoverFallback: () => {},
  }),
}));

vi.mock('@/hooks/presenters/useProfilePresenter', () => ({
  useProfilePresenter: () => ({
    user: null,
    profile: null,
    isEditModalOpen: false,
    setIsEditModalOpen: () => {},
  }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, role: 'reader', signOut: vi.fn() }),
}));

vi.mock('@/components/user/EditUserProfileModal', () => ({
  EditUserProfileModal: () => null,
}));

vi.mock('@/lib/security/security-utils', () => ({
  sanitizeImageUrl: (url: string) => url,
  getFallbackAvatar: (name: string) => `https://fallback/${name}`,
  proxyAvatarUrl: (url: string | null | undefined) => url ?? null,
}));

describe('HomePage redesign (modern vibrant)', () => {
  beforeEach(() => state.push.mockReset());

  it('renders hero spotlight, section headers, and latest chapter info', () => {
    render(
      <HomePage
        initialComics={[comic]}
        initialTrending={[comic]}
        initialLatestChapters={{ c1: chapter }}
        hydrated
      />,
    );

    expect(screen.getAllByRole('heading', { name: 'Spotlight Comic' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'popular_comics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'newly_updated_comics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'top_read_comics' })).toBeInTheDocument();
    expect(screen.getAllByText('Chapter Five').length).toBeGreaterThan(0);
  });

  it('renders no emoji anywhere in the visible text', () => {
    render(
      <HomePage
        initialComics={[comic]}
        initialTrending={[comic]}
        initialLatestChapters={{ c1: chapter }}
        hydrated
      />,
    );
    const text = document.body.textContent ?? '';
    expect(text.match(/\p{Extended_Pictographic}/gu)).toBeNull();
  });
});

describe('ProfilePageContent signed-out state', () => {
  it('Sign In button navigates to /auth/login', () => {
    render(<ProfilePageContent />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(state.push).toHaveBeenCalledWith(ROUTES.LOGIN);
  });
});
