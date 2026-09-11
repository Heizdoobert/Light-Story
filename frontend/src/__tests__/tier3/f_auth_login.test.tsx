import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/context/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/features/use-user', () => ({
  useUser: () => ({
    signIn: vi.fn(),
    signInWithEmail: vi.fn(),
    signInWithPassword: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('LoginForm accessibility attributes', () => {
  it('email field has explicit id, name and autocomplete', () => {
    render(<LoginForm />);
    const email = screen.getByLabelText('auth_email_address');
    expect(email).toHaveAttribute('id', 'login-email');
    expect(email).toHaveAttribute('name', 'email');
    expect(email).toHaveAttribute('autoComplete', 'email');
  });

  it('password field has explicit id, name and current-password autocomplete', () => {
    render(<LoginForm />);
    const password = screen.getByLabelText('auth_password');
    expect(password).toHaveAttribute('id', 'login-password');
    expect(password).toHaveAttribute('name', 'password');
    expect(password).toHaveAttribute('autoComplete', 'current-password');
  });
});
