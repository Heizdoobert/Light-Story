import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../AuthContext';
import { ROUTES } from '@/lib/constants/routes';
import UserLayout from '@/app/(user)/layout';
import { LoginForm } from '@/components/auth/LoginForm';
import * as userHooks from '@/hooks/features/use-user';

// Mock dependencies
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  usePathname: () => '/user/profile',
}));

vi.mock('@/context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fallback?: string) => fallback || k,
    language: 'VI',
    setLanguage: vi.fn(),
  }),
}));

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    toggleTheme: vi.fn(),
  }),
}));

vi.mock('@/components/layout/user-sidebar', () => ({
  default: () => <div data-testid="user-sidebar">UserSidebar</div>,
  UserSidebar: () => <div data-testid="user-sidebar">UserSidebar</div>,
}));

vi.mock('@/components/navigation/Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

vi.mock('@/components/layout/public-footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

// Mock Supabase
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: any) => mockOnAuthStateChange(cb),
      signInWithPassword: vi.fn(),
      signInWithEmail: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: (table: string) => mockFrom(table),
  },
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: any) => mockOnAuthStateChange(cb),
    },
    from: (table: string) => mockFrom(table),
  }),
}));

describe('Auth Session Persistence & Safe Layout Guards', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    mockFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'u-superadmin',
              email: 'superadmin@lightstory.com',
              full_name: 'Super Admin',
              avatar_url: null,
              role: 'superadmin',
              created_at: '2026-01-01T00:00:00Z',
            },
            error: null,
          }),
        }),
      }),
    });
  });

  const TestConsumer = () => {
    const { user, profile, role, loading, isInitialized } = useAuth();
    return (
      <div>
        <span data-testid="is-initialized">{String(isInitialized)}</span>
        <span data-testid="is-loading">{String(loading)}</span>
        <span data-testid="user-email">{user?.email || 'none'}</span>
        <span data-testid="user-role">{role || 'none'}</span>
        <span data-testid="profile-name">{profile?.full_name || 'none'}</span>
      </div>
    );
  };

  it('restores auth session and populates fallback profile immediately', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'u-superadmin',
            email: 'superadmin@lightstory.com',
            user_metadata: { full_name: 'Super Admin' },
            app_metadata: { role: 'superadmin' },
          },
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </QueryClientProvider>
    );

    // Profile is immediately available from auth metadata even before DB query settles
    await waitFor(() => {
      expect(screen.getByTestId('is-initialized').textContent).toBe('true');
      expect(screen.getByTestId('user-email').textContent).toBe('superadmin@lightstory.com');
      expect(screen.getByTestId('profile-name').textContent).toBe('Super Admin');
      expect(screen.getByTestId('user-role').textContent).toBe('superadmin');
    });
  });

  it('UserLayout does not prematurely redirect when session is valid or initializing', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'u-superadmin',
            email: 'superadmin@lightstory.com',
            app_metadata: { role: 'superadmin' },
          },
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UserLayout>
            <div data-testid="user-children">Protected User Content</div>
          </UserLayout>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-children')).toBeDefined();
    });

    // Should never have redirected to login
    expect(mockReplace).not.toHaveBeenCalledWith(ROUTES.LOGIN);
  });

  it('LoginForm auto-redirects authenticated superadmin directly to admin dashboard', async () => {
    vi.spyOn(userHooks, 'useUser').mockReturnValue({
      user: { id: 'u-superadmin', email: 'superadmin@lightstory.com' } as any,
      profile: { full_name: 'Super Admin' } as any,
      role: 'superadmin',
      isLoading: false,
      isInitialized: true,
      isAuthenticated: true,
      isAdmin: true,
      isStaff: true,
      signIn: vi.fn(),
      signInWithEmail: vi.fn(),
      signInWithPassword: vi.fn(),
      sendPasswordReset: vi.fn(),
      signOut: vi.fn(),
      register: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <LoginForm />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(ROUTES.ADMIN.DASHBOARD);
    });
  });
});
