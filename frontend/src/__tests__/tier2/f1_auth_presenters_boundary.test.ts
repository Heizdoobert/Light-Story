process.env.NEXT_PUBLIC_ENC_KEY =
  process.env.NEXT_PUBLIC_ENC_KEY ?? "test-secret-key-0123456789abcdef";

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FormEvent } from "react";

const authMocks = {
  signIn: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithPassword: vi.fn(),
  register: vi.fn(),
  sendPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
};

vi.mock("@/context/AuthContext", () => ({ useAuth: () => authMocks }));

const toastMocks = { success: vi.fn(), error: vi.fn() };
vi.mock("sonner", () => ({ toast: toastMocks }));

type UseAuthModalPresenter = Awaited<
  ReturnType<typeof import("@/hooks/presenters/useAuthModalPresenter")>
>["useAuthModalPresenter"];

const event = (): FormEvent => ({ preventDefault: vi.fn() } as unknown as FormEvent);

describe("useAuthModalPresenter boundary cases", () => {
  let useAuthModalPresenter: UseAuthModalPresenter;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/hooks/presenters/useAuthModalPresenter");
    useAuthModalPresenter = mod.useAuthModalPresenter;
  });

  it("register mode: whitespace-only full name is rejected before auth", async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    act(() => {
      result.current.setMode("register");
      result.current.setFullName("   ");
      result.current.setEmail("user@example.com");
      result.current.setPassword("secret123");
      result.current.setConfirmPassword("secret123");
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(authMocks.register).not.toHaveBeenCalled();
    expect(toastMocks.error).toHaveBeenCalledWith("Please enter your full name");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("register mode: short password is rejected with a length toast", async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    act(() => {
      result.current.setMode("register");
      result.current.setFullName("Alice");
      result.current.setEmail("user@example.com");
      result.current.setPassword("abc");
      result.current.setConfirmPassword("abc");
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(authMocks.register).not.toHaveBeenCalled();
    expect(toastMocks.error).toHaveBeenCalledWith(
      "Password must be at least 6 characters"
    );
    expect(result.current.isSubmitting).toBe(false);
  });

  it("register mode: password mismatch is rejected with a toast", async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    act(() => {
      result.current.setMode("register");
      result.current.setFullName("Alice");
      result.current.setEmail("user@example.com");
      result.current.setPassword("secret123");
      result.current.setConfirmPassword("secret456");
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(authMocks.register).not.toHaveBeenCalled();
    expect(toastMocks.error).toHaveBeenCalledWith("Password confirmation does not match");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("register mode: empty email is silently ignored (no toasts, no auth call)", async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    act(() => {
      result.current.setMode("register");
      result.current.setFullName("Alice");
      result.current.setPassword("secret123");
      result.current.setConfirmPassword("secret123");
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(authMocks.register).not.toHaveBeenCalled();
    expect(toastMocks.error).not.toHaveBeenCalled();
    expect(toastMocks.success).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("register mode: valid submission trims the full name and resets the form", async () => {
    authMocks.register.mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    act(() => {
      result.current.setMode("register");
      result.current.setFullName("  Alice Example  ");
      result.current.setEmail("user@example.com");
      result.current.setPassword("secret123");
      result.current.setConfirmPassword("secret123");
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(authMocks.register).toHaveBeenCalledWith(
      "user@example.com",
      "secret123",
      "Alice Example"
    );
    expect(toastMocks.success).toHaveBeenCalledWith(
      "Registration successful. Please check your email to verify your account."
    );
    expect(result.current.mode).toBe("signin");
    expect(result.current.password).toBe("");
    expect(result.current.confirmPassword).toBe("");
    expect(result.current.isSubmitting).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("forgot mode: valid email sends a reset and switches back to signin", async () => {
    authMocks.sendPasswordReset.mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    act(() => {
      result.current.setMode("forgot");
      result.current.setEmail("user@example.com");
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(authMocks.sendPasswordReset).toHaveBeenCalledWith("user@example.com");
    expect(toastMocks.success).toHaveBeenCalledWith(
      "Password reset email sent. Please check your inbox."
    );
    expect(result.current.mode).toBe("signin");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("forgot mode: empty email is silently ignored (no toasts, no auth call)", async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    act(() => {
      result.current.setMode("forgot");
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(authMocks.sendPasswordReset).not.toHaveBeenCalled();
    expect(toastMocks.error).not.toHaveBeenCalled();
    expect(toastMocks.success).not.toHaveBeenCalled();
    expect(result.current.mode).toBe("forgot");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("signin mode: missing password is rejected with a toast", async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    act(() => {
      result.current.setEmail("user@example.com");
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(authMocks.signInWithPassword).not.toHaveBeenCalled();
    expect(toastMocks.error).toHaveBeenCalledWith("Please enter your password");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("resetLocalState resets mode and every form field to defaults", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    act(() => {
      result.current.setMode("register");
      result.current.setFullName("Alice");
      result.current.setEmail("user@example.com");
      result.current.setPassword("secret123");
      result.current.setConfirmPassword("secret123");
    });
    act(() => {
      result.current.resetLocalState();
    });
    expect(result.current.mode).toBe("signin");
    expect(result.current.fullName).toBe("");
    expect(result.current.email).toBe("");
    expect(result.current.password).toBe("");
    expect(result.current.confirmPassword).toBe("");
  });

  it("google sign-in calls signIn and always resets isSubmitting", async () => {
    authMocks.signIn.mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    await act(async () => {
      await result.current.handleGoogleSignIn();
    });
    expect(authMocks.signIn).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(false);
  });

  it("magic link sign-in with email calls signInWithEmail", async () => {
    authMocks.signInWithEmail.mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    act(() => {
      result.current.setEmail("user@example.com");
    });
    await act(async () => {
      await result.current.handleMagicLinkSignIn();
    });
    expect(authMocks.signInWithEmail).toHaveBeenCalledWith("user@example.com");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("magic link sign-in without email shows a toast and does not call auth", async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useAuthModalPresenter({ isOpen: true, onClose }));
    await act(async () => {
      await result.current.handleMagicLinkSignIn();
    });
    expect(toastMocks.error).toHaveBeenCalledWith("Please enter your email first");
    expect(authMocks.signInWithEmail).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });
});
