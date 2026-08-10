import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
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

const HOOKS_DIR = join(__dirname, '..', '..', 'hooks');

const walk = (dir: string, ext: string): string[] => {
  const results: string[] = [];
  const visit = (d: string): void => {
    for (const entry of readdirSync(d).sort()) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) visit(full);
      else if (entry.endsWith(ext)) results.push(full);
    }
  };
  visit(dir);
  return results;
};

const NAMED_FEATURE_EXPORTS = [
  'useBookmarks',
  'useReadingHistory',
  'useRecommendations',
];

const NAMED_COMMON_EXPORTS = ['useGlobalErrorHandler', 'isSupabaseConnectionError', 'getErrorMessage'];

describe('F3 boundary: hooks barrel (@/hooks)', () => {
  let hooks: HooksModule;

  beforeAll(async () => {
    hooks = await import('@/hooks');
  });

  it('still re-exports exactly 3 barrel sections via export * (presenters / features / common)', () => {
    const barrel = readFileSync(join(HOOKS_DIR, 'index.ts'), 'utf-8').replace(/^\uFEFF/, '');
    const lines = barrel.split(/\r?\n/);
    const exportStars = lines.filter((l) => l.trim().startsWith('export * from'));
    expect(exportStars).toHaveLength(3);
    expect(exportStars.filter((l) => l.includes('common'))).toHaveLength(1);
    expect(exportStars.filter((l) => l.includes('features'))).toHaveLength(1);
    expect(exportStars.filter((l) => l.includes('presenters'))).toHaveLength(1);
  });

  it('resolves every export * target to a real file on disk', () => {
    const barrel = readFileSync(join(HOOKS_DIR, 'index.ts'), 'utf-8').replace(/^\uFEFF/, '');
    for (const line of barrel.split(/\r?\n/)) {
      const m = line.match(/export \* from ['"](\.[^'"]+)['"]/);
      if (!m) continue;
      const rel = m[1].replace(/^\.\//, '');
      expect(
        existsSync(join(HOOKS_DIR, `${rel}.ts`)) || existsSync(join(HOOKS_DIR, rel, 'index.ts')),
        `${rel} re-exported but missing on disk`,
      ).toBe(true);
    }
  });

  it('keeps every presenter file free of default exports', () => {
    for (const file of walk(join(HOOKS_DIR, 'presenters'), '.ts')) {
      const content = readFileSync(file, 'utf-8').replace(/^\uFEFF/, '');
      expect(content, file).not.toMatch(/export default/);
    }
  });

  it('keeps feature files free of default exports after dead-hook cleanup', () => {
    const defaults = walk(join(HOOKS_DIR, 'features'), '.ts')
      .filter((f) => readFileSync(f, 'utf-8').replace(/^\uFEFF/, '').includes('export default'))
      .map((f) => f.replace(/\\/g, '/').split('/').pop());
    expect(defaults).toEqual([]);
  });

  it('does NOT surface removed default-only hooks on the namespace', () => {
    expect(hooks as Record<string, unknown>).not.toHaveProperty('useChapterSubscription');
    expect(hooks as Record<string, unknown>).not.toHaveProperty('useStories');
  });

  it('surfaces all 3 named feature exports and all 3 named common exports', () => {
    for (const name of [...NAMED_FEATURE_EXPORTS, ...NAMED_COMMON_EXPORTS]) {
      expect(hooks, name).toHaveProperty(name);
      expect(typeof hooks[name as keyof HooksModule]).toBe('function');
    }
  });

  it('keeps every runtime export a function and no default export', () => {
    const keys = Object.keys(hooks);
    expect(keys.length).toBeGreaterThanOrEqual(18);
    for (const key of keys) {
      expect(typeof hooks[key as keyof HooksModule], key).toBe('function');
    }
    expect((hooks as Record<string, unknown>).default).toBeUndefined();
  });
});
