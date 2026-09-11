import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Header } from '@/components/navigation/Header';
import { ROUTES } from '@/lib/constants/routes';

const state = vi.hoisted(() => ({
  push: vi.fn(),
  signOut: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  loggedIn: false,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: state.push }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: state.loggedIn ? { id: 'u1', email: 'u1@test.com' } : null,
    profile: state.loggedIn ? { full_name: 'Test User', avatar_url: null, email: 'u1@test.com' } : null,
    role: 'reader',
    signOut: state.signOut,
  }),
}));

vi.mock('@/context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'VI',
    setLanguage: vi.fn(),
    t: (key: string) => key,
  }),
}));

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: (...a: unknown[]) => state.toastSuccess(...a), error: (...a: unknown[]) => state.toastError(...a) },
}));

vi.mock('@/components/ui/notification-bell', () => ({
  NotificationBell: () => null,
}));

vi.mock('@/lib/api/apiClient', () => ({
  apiClient: { get: vi.fn(async () => []) },
}));

vi.mock('@/services/comics/story.service', () => ({
  fetchStoriesPage: vi.fn(async () => ({ items: [] })),
}));

vi.mock('@/services/comics/comicCms.service', () => ({
  proxiedR2ImageUrl: (url: string) => url,
}));

vi.mock('@/lib/security/security-utils', () => ({
  getFallbackAvatar: (name: string) => `https://fallback/${name}`,
  proxyAvatarUrl: (url: string | null | undefined) => url ?? null,
}));

describe('Header auth flow (public UI overhaul)', () => {
  beforeEach(() => {
    state.push.mockReset();
    state.signOut.mockReset();
    state.toastSuccess.mockReset();
    state.toastError.mockReset();
    state.loggedIn = false;
  });

  it('logged out: login button navigates to /auth/login instead of opening a popup', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: 'login' }));
    expect(state.push).toHaveBeenCalledWith(ROUTES.LOGIN);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('logged in: mobile drawer shows user block and logout, logout navigates home', async () => {
    state.loggedIn = true;
    state.signOut.mockResolvedValueOnce(undefined);
    render(<Header />);

    fireEvent.click(screen.getAllByRole('button')[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Test User')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'logout' }));
    await waitFor(() => expect(state.signOut).toHaveBeenCalled());
    await waitFor(() => expect(state.toastSuccess).toHaveBeenCalled());
    expect(state.push).toHaveBeenCalledWith(ROUTES.HOME);
  });

  it('logout failure: shows error toast and does not navigate', async () => {
    state.loggedIn = true;
    state.signOut.mockRejectedValueOnce(new Error('network'));
    render(<Header />);

    fireEvent.click(screen.getAllByRole('button')[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'logout' }));

    await waitFor(() => expect(state.toastError).toHaveBeenCalled());
    expect(state.toastSuccess).not.toHaveBeenCalled();
    expect(state.push).not.toHaveBeenCalled();
  });

  it('mobile hamburger is named, exposes expanded state, and opens the drawer', async () => {
    render(<Header />);
    const hamburger = screen.getByRole('button', { name: 'header_open_menu' });
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    expect(hamburger).toHaveAttribute('aria-controls', 'mobile-nav-drawer');

    fireEvent.click(hamburger);
    await waitFor(() => expect(hamburger).toHaveAttribute('aria-expanded', 'true'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('id', 'mobile-nav-drawer');
  });
});
