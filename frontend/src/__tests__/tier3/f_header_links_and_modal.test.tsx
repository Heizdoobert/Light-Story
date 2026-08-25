import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/navigation/Header';
import { ROUTES } from '@/lib/constants/routes';

const state = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: state.push }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, role: 'reader', signOut: vi.fn() }),
}));

vi.mock('@/context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'VI',
    setLanguage: vi.fn(),
  }),
}));

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('@/components/ui/notification-bell', () => ({
  NotificationBell: () => null,
}));

vi.mock('@/lib/api/apiClient', () => ({
  apiClient: { get: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/services/comics/story.service', () => ({
  fetchStoriesPage: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

vi.mock('@/services/comics/comicCms.service', () => ({
  proxiedR2ImageUrl: () => null,
}));

vi.mock('@/components/shared/ui/QuickSearchModal', () => ({
  QuickSearchModal: ({ isOpen }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="quick-search-modal">Modal Open</div> : null
  ),
}));

describe('Header GROUP/FANPAGE links', () => {
  it('GROUP link points to /group', () => {
    render(<Header />);
    const links = screen.getAllByRole('link');
    const groupLink = links.find(l => l.getAttribute('href') === ROUTES.GROUP);
    expect(groupLink).toBeDefined();
  });

  it('FANPAGE link points to /fanpage', () => {
    render(<Header />);
    const links = screen.getAllByRole('link');
    const fanpageLink = links.find(l => l.getAttribute('href') === ROUTES.FANPAGE);
    expect(fanpageLink).toBeDefined();
  });

  it('GROUP link does not point to home', () => {
    render(<Header />);
    const links = screen.getAllByRole('link');
    const groupLink = links.find(l => l.getAttribute('href') === ROUTES.GROUP);
    expect(groupLink).toBeDefined();
    expect(groupLink!.getAttribute('href')).not.toBe('/');
  });
});

describe('Header mobile search opens modal', () => {
  it('search icon exists', () => {
    render(<Header />);
    const searchButton = screen.getAllByRole('button').find(
      b => b.getAttribute('title') === 'search'
    );
    expect(searchButton).toBeDefined();
  });
});
