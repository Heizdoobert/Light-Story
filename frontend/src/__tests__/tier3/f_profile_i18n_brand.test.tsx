import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfilePageContent } from '@/components/user/ProfilePageContent';
import { ROUTES } from '@/lib/constants/routes';

const state = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: state.push }),
}));

vi.mock('@/hooks/presenters/useProfilePresenter', () => ({
  useProfilePresenter: () => ({
    user: null,
    profile: null,
    isEditModalOpen: false,
    setIsEditModalOpen: vi.fn(),
  }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, role: 'reader', signOut: vi.fn() }),
}));

vi.mock('@/context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'EN',
    setLanguage: () => {},
  }),
}));

vi.mock('@/components/user/EditUserProfileModal', () => ({
  EditUserProfileModal: () => null,
}));

vi.mock('@/lib/security/security-utils', () => ({
  sanitizeImageUrl: (url: string) => url,
  getFallbackAvatar: (name: string) => `https://fallback/${name}`,
  proxyAvatarUrl: (url: string | null | undefined) => url ?? null,
}));

vi.mock('@/components/reader/AdRenderer', () => ({
  AdRenderer: () => null,
}));

describe('ProfilePageContent i18n', () => {
  it('shows i18n key for not signed in heading', () => {
    render(<ProfilePageContent />);
    expect(screen.getByText('profile_not_signed_in')).toBeInTheDocument();
  });

  it('shows i18n key for sign in prompt', () => {
    render(<ProfilePageContent />);
    expect(screen.getByText('profile_sign_in_prompt')).toBeInTheDocument();
  });

  it('shows i18n key for sign in button', () => {
    render(<ProfilePageContent />);
    expect(screen.getByRole('button', { name: /profile_sign_in/ })).toBeInTheDocument();
  });

  it('navigates to login on sign in click', () => {
    state.push.mockReset();
    render(<ProfilePageContent />);
    fireEvent.click(screen.getByRole('button', { name: /profile_sign_in/ }));
    expect(state.push).toHaveBeenCalledWith(ROUTES.LOGIN);
  });
});

describe('ProfilePageContent brand colors', () => {
  it('uses orange gradient for banner', () => {
    const { container } = render(<ProfilePageContent />);
    const banner = container.querySelector('[class*="from-orange-500"]');
    expect(banner).toBeInTheDocument();
  });

  it('uses orange gradient for avatar fallback', () => {
    const { container } = render(<ProfilePageContent />);
    const avatar = container.querySelector('[class*="from-orange-500"][class*="to-amber-600"]');
    expect(avatar).toBeInTheDocument();
  });
});
