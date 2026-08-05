import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { FormEvent } from 'react';

const authMocks = {
  signIn: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithPassword: vi.fn(),
  register: vi.fn(),
  sendPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
};

const toastMocks = { success: vi.fn(), error: vi.fn() };

const routerReplace = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authMocks,
}));

vi.mock('sonner', () => ({ toast: toastMocks }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace }),
}));

const event = (): FormEvent => ({ preventDefault: vi.fn() } as unknown as FormEvent);

describe('F1 useAuthModalPresenter', () => {
  let useAuthModalPresenter: typeof import('@/hooks/presenters/useAuthModalPresenter')['useAuthModalPresenter'];

  beforeEach(async () => {
    vi.clearAllMocks();
    useAuthModalPresenter = (
      await import('@/hooks/presenters/useAuthModalPresenter')
    ).useAuthModalPresenter;
  });

  it('initializes in signin mode with empty fields and idle submit state', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    expect(result.current.mode).toBe('signin');
    expect(result.current.fullName).toBe('');
    expect(result.current.email).toBe('');
    expect(result.current.password).toBe('');
    expect(result.current.confirmPassword).toBe('');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('signs in with email and password, toasts success, and closes the modal', async () => {
    authMocks.signInWithPassword.mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    act(() => {
      result.current.setEmail('user@example.com');
      result.current.setPassword('secret123');
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(authMocks.signInWithPassword).toHaveBeenCalledWith('user@example.com', 'secret123');
    expect(toastMocks.success).toHaveBeenCalledWith('Signed in successfully');
    expect(onClose).toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('does nothing when submitting without an email', async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(authMocks.signInWithPassword).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('rejects an empty password in signin mode', async () => {
    const { result } = renderHook(() =>
      useAuthModalPresenter({ isOpen: true, onClose: vi.fn() }),
    );
    act(() => {
      result.current.setEmail('user@example.com');
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(toastMocks.error).toHaveBeenCalledWith('Please enter your password');
    expect(authMocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it('registers a user with fullName, toasts success, and returns to signin mode', async () => {
    authMocks.register.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAuthModalPresenter({ isOpen: true, onClose: vi.fn() }),
    );
    act(() => {
      result.current.setMode('register');
      result.current.setFullName('Ada Lovelace');
      result.current.setEmail('ada@example.com');
      result.current.setPassword('longsecret');
      result.current.setConfirmPassword('longsecret');
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(authMocks.register).toHaveBeenCalledWith('ada@example.com', 'longsecret', 'Ada Lovelace');
    expect(toastMocks.success).toHaveBeenCalledWith(
      'Registration successful. Please check your email to verify your account.',
    );
    expect(result.current.mode).toBe('signin');
    expect(result.current.password).toBe('');
    expect(result.current.confirmPassword).toBe('');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('validates register input: fullName, password length, and password match', async () => {
    const { result } = renderHook(() =>
      useAuthModalPresenter({ isOpen: true, onClose: vi.fn() }),
    );
    act(() => {
      result.current.setMode('register');
      result.current.setEmail('ada@example.com');
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(toastMocks.error).toHaveBeenCalledWith('Please enter your full name');

    act(() => {
      result.current.setFullName('Ada Lovelace');
      result.current.setPassword('short');
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(toastMocks.error).toHaveBeenCalledWith('Password must be at least 6 characters');

    act(() => {
      result.current.setPassword('longsecret');
      result.current.setConfirmPassword('different');
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(toastMocks.error).toHaveBeenCalledWith('Password confirmation does not match');
    expect(authMocks.register).not.toHaveBeenCalled();
  });

  it('sends a password reset email in forgot mode and returns to signin', async () => {
    authMocks.sendPasswordReset.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAuthModalPresenter({ isOpen: true, onClose: vi.fn() }),
    );
    act(() => {
      result.current.setMode('forgot');
      result.current.setEmail('ada@example.com');
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(authMocks.sendPasswordReset).toHaveBeenCalledWith('ada@example.com');
    expect(toastMocks.success).toHaveBeenCalledWith(
      'Password reset email sent. Please check your inbox.',
    );
    expect(result.current.mode).toBe('signin');
  });

  it('stays calm when sign-in fails: no success toast, submit state resets', async () => {
    authMocks.signInWithPassword.mockRejectedValue(new Error('bad credentials'));
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    act(() => {
      result.current.setEmail('user@example.com');
      result.current.setPassword('secret123');
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(toastMocks.success).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('triggers Google OAuth via signIn and releases the submit flag', async () => {
    authMocks.signIn.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAuthModalPresenter({ isOpen: true, onClose: vi.fn() }),
    );
    await act(async () => {
      await result.current.handleGoogleSignIn();
    });
    expect(authMocks.signIn).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('sends a magic link only when an email is present', async () => {
    authMocks.signInWithEmail.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAuthModalPresenter({ isOpen: true, onClose: vi.fn() }),
    );
    await act(async () => {
      await result.current.handleMagicLinkSignIn();
    });
    expect(toastMocks.error).toHaveBeenCalledWith('Please enter your email first');
    expect(authMocks.signInWithEmail).not.toHaveBeenCalled();

    act(() => {
      result.current.setEmail('ada@example.com');
    });
    await act(async () => {
      await result.current.handleMagicLinkSignIn();
    });
    expect(authMocks.signInWithEmail).toHaveBeenCalledWith('ada@example.com');
    expect(result.current.isSubmitting).toBe(false);
  });
});

describe('F1 useResetPasswordPresenter', () => {
  let useResetPasswordPresenter: typeof import('@/hooks/presenters/useResetPasswordPresenter')['useResetPasswordPresenter'];

  beforeEach(async () => {
    vi.clearAllMocks();
    window.location.hash = '';
    useResetPasswordPresenter = (
      await import('@/hooks/presenters/useResetPasswordPresenter')
    ).useResetPasswordPresenter;
  });

  it('starts with empty fields, no recovery flow, and finishes verifying on mount', async () => {
    const { result } = renderHook(() => useResetPasswordPresenter());
    expect(result.current.password).toBe('');
    expect(result.current.confirmPassword).toBe('');
    expect(result.current.isRecoveryFlow).toBe(false);
    await waitFor(() => expect(result.current.verifying).toBe(false));
  });

  it('detects a recovery flow from the location hash', async () => {
    window.location.hash = '#type=recovery';
    const { result } = renderHook(() => useResetPasswordPresenter());
    await waitFor(() => expect(result.current.verifying).toBe(false));
    expect(result.current.isRecoveryFlow).toBe(true);
  });

  it('ignores unrelated hash fragments', async () => {
    window.location.hash = '#section=faq';
    const { result } = renderHook(() => useResetPasswordPresenter());
    await waitFor(() => expect(result.current.verifying).toBe(false));
    expect(result.current.isRecoveryFlow).toBe(false);
  });

  it('rejects a password shorter than 6 characters', async () => {
    const { result } = renderHook(() => useResetPasswordPresenter());
    await waitFor(() => expect(result.current.verifying).toBe(false));
    act(() => {
      result.current.setPassword('short');
      result.current.setConfirmPassword('short');
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(toastMocks.error).toHaveBeenCalledWith('Password must be at least 6 characters');
    expect(authMocks.updatePassword).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it('rejects mismatched password confirmation', async () => {
    const { result } = renderHook(() => useResetPasswordPresenter());
    await waitFor(() => expect(result.current.verifying).toBe(false));
    act(() => {
      result.current.setPassword('longsecret');
      result.current.setConfirmPassword('different');
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(toastMocks.error).toHaveBeenCalledWith('Password confirmation does not match');
    expect(authMocks.updatePassword).not.toHaveBeenCalled();
  });

  it('updates the password, toasts success, and redirects home', async () => {
    authMocks.updatePassword.mockResolvedValue(undefined);
    const { result } = renderHook(() => useResetPasswordPresenter());
    await waitFor(() => expect(result.current.verifying).toBe(false));
    act(() => {
      result.current.setPassword('longsecret');
      result.current.setConfirmPassword('longsecret');
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(authMocks.updatePassword).toHaveBeenCalledWith('longsecret');
    expect(toastMocks.success).toHaveBeenCalledWith('Password updated. Please sign in again.');
    expect(routerReplace).toHaveBeenCalledWith('/');
    expect(result.current.submitting).toBe(false);
  });

  it('stays on page when the update fails: no success toast, no redirect', async () => {
    authMocks.updatePassword.mockRejectedValue(new Error('token expired'));
    const { result } = renderHook(() => useResetPasswordPresenter());
    await waitFor(() => expect(result.current.verifying).toBe(false));
    act(() => {
      result.current.setPassword('longsecret');
      result.current.setConfirmPassword('longsecret');
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(toastMocks.success).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
    expect(result.current.submitting).toBe(false);
  });
});
