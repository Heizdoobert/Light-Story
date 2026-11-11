import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Header } from '@/components/navigation/Header';
import * as fs from 'fs';
import * as path from 'path';

const state = vi.hoisted(() => ({
  push: vi.fn(),
  signOut: vi.fn(),
  loggedIn: false,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: state.push }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: state.loggedIn ? { id: 'u1', email: 'u1@test.com' } : null,
    profile: state.loggedIn ? { full_name: 'Test Reader', avatar_url: null, email: 'u1@test.com' } : null,
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
  toast: { success: vi.fn(), error: vi.fn() },
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

describe('UI/UX and Accessibility Standards (jakubkrehel/skills)', () => {
  beforeEach(() => {
    state.push.mockReset();
    state.signOut.mockReset();
    state.loggedIn = false;
  });

  it('verifies globals.css adheres to better-colors, better-layout, and better-accessibility', () => {
    const cssPath = path.resolve(__dirname, '../../app/globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Root typography standard
    expect(cssContent).toContain('font-size: 16px;');

    // Scroll padding to avoid sticky header occlusion
    expect(cssContent).toContain('scroll-padding-top: 5rem;');

    // Reduced motion media query for vestibular safety
    expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');

    // Brand color consistency (orange #f97316 replaces electric blue #001eff)
    expect(cssContent).toContain('--primary: #f97316;');
    expect(cssContent).not.toContain('--primary: #001eff;');
  });

  it('provides accessible names and ARIA attributes on search controls', () => {
    render(<Header />);

    // Search input accessible name
    const searchInput = screen.getByLabelText('search_placeholder');
    expect(searchInput).toBeInTheDocument();

    // Desktop search submit button accessible name
    const searchButtons = screen.getAllByRole('button', { name: 'search' });
    expect(searchButtons.length).toBeGreaterThan(0);
  });

  it('manages ARIA state on categories dropdown trigger button', () => {
    render(<Header />);

    const categoriesBtn = screen.getByRole('button', { name: 'nav_categories_title' });
    expect(categoriesBtn).toBeInTheDocument();
    expect(categoriesBtn).toHaveAttribute('aria-haspopup', 'true');
    expect(categoriesBtn).toHaveAttribute('aria-expanded', 'false');

    // Click to expand
    fireEvent.click(categoriesBtn);
    expect(categoriesBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('manages ARIA menu semantics and expanded state on user profile avatar button', async () => {
    state.loggedIn = true;
    render(<Header />);

    const userMenuBtn = screen.getByRole('button', { name: 'Menu tài khoản' });
    expect(userMenuBtn).toBeInTheDocument();
    expect(userMenuBtn).toHaveAttribute('aria-haspopup', 'menu');
    expect(userMenuBtn).toHaveAttribute('aria-expanded', 'false');

    // Click to open user menu dropdown
    fireEvent.click(userMenuBtn);
    expect(userMenuBtn).toHaveAttribute('aria-expanded', 'true');

    // Check user menu content appears
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'logout' })).toBeInTheDocument();
    });
  });
});
