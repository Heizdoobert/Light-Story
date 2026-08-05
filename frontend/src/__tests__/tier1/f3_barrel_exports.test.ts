import { beforeAll, describe, expect, it, vi } from 'vitest';

process.env.NEXT_PUBLIC_ENC_KEY = process.env.NEXT_PUBLIC_ENC_KEY ?? 'test-secret-key-0123456789abcdef';

const authMocks = {
  signIn: vi.fn(async () => ({ user: { id: 'u1' }, error: null })),
  signInWithEmail: vi.fn(async () => ({ user: null, error: null })),
  signInWithPassword: vi.fn(async () => ({ user: { id: 'u1' }, error: null })),
  register: vi.fn(async () => ({ user: { id: 'u1' }, error: null })),
  sendPasswordReset: vi.fn(async () => ({ error: null })),
  updatePassword: vi.fn(async () => ({ error: null })),
};

const toastMocks = { success: vi.fn(), error: vi.fn() };
const routerReplace = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authMocks,
}));

vi.mock('sonner', () => ({
  toast: toastMocks,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace, push: routerReplace }),
  useParams: () => ({ comicId: 'c1', chapterId: 'ch1' }),
}));

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

type HooksModule = typeof import('@/hooks');

const EPONYMOUS_PRESENTER_HOOKS = [
  'useAdminDashboardPresenter',
  'useAdminUserPresenter',
  'useAnalyticsDashboard',
  'useAuditLogsPresenter',
  'useAuthModalPresenter',
  'useAuthorPresenter',
  'useCategoryPresenter',
  'useChapterFormPresenter',
  'useComicDetailPresenter',
  'useCreateComicPresenter',
  'useHomePagePresenter',
  'useOperationsPresenter',
  'useProfilePresenter',
  'useReadChapterPresenter',
  'useResetPasswordPresenter',
  'useSearchPresenter',
  'useStoryFormPresenter',
  'useStoryManagementPresenter',
  'useSystemSettingsPresenter',
  'useTranslatorPresenter',
];

const EXTRA_PRESENTER_EXPORTS = ['useAdConfigsQuery', 'useUpdateAdConfig', 'useCrudMutation'];

const FEATURE_AND_COMMON_HOOKS = [
  'useBookmarks',
  'useChapterDetail',
  'useReadingHistory',
  'useRecommendations',
  'useStories',
  'useStoryDetail',
  'useStoryMutations',
  'useAutoSave',
  'useGlobalErrorHandler',
  'useOptimisticUpdate',
];

const EXTRA_COMMON_EXPORTS = ['isSupabaseConnectionError', 'getErrorMessage'];

const ALL_RUNTIME_EXPORTS = [
  ...EPONYMOUS_PRESENTER_HOOKS,
  ...EXTRA_PRESENTER_EXPORTS,
  ...FEATURE_AND_COMMON_HOOKS,
  ...EXTRA_COMMON_EXPORTS,
];

describe('F3 hooks barrel (@/hooks)', () => {
  let hooks: HooksModule;

  beforeAll(async () => {
    hooks = await import('@/hooks');
  });

  it('re-exports all 20 presenter hooks under their eponymous names', () => {
    for (const name of EPONYMOUS_PRESENTER_HOOKS) {
      expect(hooks, name).toHaveProperty(name);
      expect(typeof hooks[name as keyof HooksModule]).toBe('function');
    }
  });

  it('re-exports the extra presenter exports (ad config hooks + crud mutation)', () => {
    for (const name of EXTRA_PRESENTER_EXPORTS) {
      expect(hooks, name).toHaveProperty(name);
      expect(typeof hooks[name as keyof HooksModule]).toBe('function');
    }
  });

  it('re-exports all 10 feature and common hooks', () => {
    for (const name of FEATURE_AND_COMMON_HOOKS) {
      expect(hooks, name).toHaveProperty(name);
      expect(typeof hooks[name as keyof HooksModule]).toBe('function');
    }
  });

  it('re-exports the error helper functions', () => {
    for (const name of EXTRA_COMMON_EXPORTS) {
      expect(hooks, name).toHaveProperty(name);
      expect(typeof hooks[name as keyof HooksModule]).toBe('function');
    }
  });

  it('exports exactly 35 runtime values, all functions', () => {
    const keys = Object.keys(hooks).sort();
    expect(keys).toEqual([...ALL_RUNTIME_EXPORTS].sort());
    for (const key of keys) {
      expect(typeof hooks[key as keyof HooksModule], key).toBe('function');
    }
  });

  it('has no default export', () => {
    expect((hooks as Record<string, unknown>).default).toBeUndefined();
  });
});
