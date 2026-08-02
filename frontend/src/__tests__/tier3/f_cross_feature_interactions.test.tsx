import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import * as hooks from '@/hooks';
import { CreateComicForm } from '@/components/comics/CreateComicForm';
import {
  uploadComicCover,
  uploadChapterImages,
  createComic,
  createComicChapter,
} from '@/services/comics/comic.service';

const state = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_ENC_KEY = process.env.NEXT_PUBLIC_ENC_KEY ?? 'test-secret-key-0123456789abcdef';
  return {
    push: vi.fn(),
    replace: vi.fn(),
    alert: vi.fn(),
    currentRole: 'admin' as string,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: state.push, replace: state.replace }),
  usePathname: () => '/comics/new',
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, role: state.currentRole, loading: false }),
  UserRole: {},
}));

vi.mock('@/lib/api/apiClient', () => ({ apiClient: state.apiClient }));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/infrastructure/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      refreshSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
  },
}));

const validJwt = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.sig`;
const validPng = new File(['fake-png'], 'cover.png', { type: 'image/png' });
const okUploadResponse = () => ({
  ok: true,
  status: 200,
  json: async () => ({ success: true, urls: ['https://r2.example/cover.webp'] }),
});

function seedToken(): void {
  localStorage.setItem(
    'sb-test-auth-token',
    JSON.stringify({ access_token: validJwt, expires_at: Date.now() + 3_600_000 }),
  );
}

const realFetcher = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  delete process.env.NEXT_PUBLIC_GATEWAY_URL;
  delete process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION;
  delete process.env.NEXT_PUBLIC_R2_BUCKET_COVERS;
  delete process.env.NEXT_PUBLIC_R2_BUCKET_CHAPTERS;
  delete process.env.NEXT_PUBLIC_ENABLE_LOCAL_DEV_FALLBACK;
  state.currentRole = 'admin';
  realFetcher.mockResolvedValue(okUploadResponse());
  vi.stubGlobal('fetch', realFetcher);
  vi.stubGlobal('alert', state.alert);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('F1 x F3 x F7: hooks barrel and admin-gated comic form', () => {
  it('exposes the full hooks barrel and renders the comic form for an admin', async () => {
    const expected = [
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
      'useAdConfigsQuery',
      'useUpdateAdConfig',
      'useCrudMutation',
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
      'isSupabaseConnectionError',
      'getErrorMessage',
    ].sort();
    const keys = Object.keys(hooks).sort();
    expect(keys).toEqual(expected);
    for (const key of keys) {
      expect(typeof hooks[key as keyof typeof hooks]).toBe('function');
    }

    render(<CreateComicForm />);
    expect(screen.getByPlaceholderText('Title')).toBeTruthy();
    expect(screen.getByPlaceholderText('Description')).toBeTruthy();
    expect(screen.getByRole('button')).toBeTruthy();
  });
});

describe('F2 x F4 x F5: health endpoint, worker origin guard, and gateway URL resolution', () => {
  it('keeps the health contract and honors NEXT_PUBLIC_GATEWAY_URL for uploads', async () => {
    const health = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'api', 'health', 'route.ts'),
      'utf8',
    );
    expect(health).toContain('NextResponse.json');
    expect(health).toContain('status');

    const worker = fs.readFileSync(
      path.join(process.cwd(), '..', 'workers', 'kv-worker', 'src', 'index.ts'),
      'utf8',
    );
    expect(worker).toContain('isOriginAllowed');
    expect(worker).toContain('No route:');

    process.env.NEXT_PUBLIC_GATEWAY_URL = 'http://custom:9999';
    const url = await uploadComicCover(validPng);
    expect(realFetcher).toHaveBeenCalledWith(
      'http://custom:9999/api/admin/r2/upload',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(url).toBe('https://r2.example/cover.webp');
  });
});

describe('F6 x F7: chapter status lifecycle across SQL, entity, and service', () => {
  it('keeps the status union aligned and creates chapters via the real service', async () => {
    const sql = fs.readFileSync(
      path.join(
        process.cwd(),
        '..',
        'backend-supabase',
        'supabase',
        'migrations',
        '20260730000004_add_chapter_status.sql',
      ),
      'utf8',
    );
    expect(sql).toContain('uploading');
    expect(sql).toContain('draft');
    expect(sql).toContain('published');

    const mockChapter = {
      id: 'ch1',
      story_id: 'c1',
      chapter_number: 1,
      title: 'Ch 1',
      content: '...',
      status: 'uploading',
      created_at: '2026-08-02T00:00:00Z',
    };
    state.apiClient.post.mockResolvedValue({ chapter: mockChapter });

    const chapter = await createComicChapter({
      comicId: 'c1',
      storyId: 's1',
      tenantKey: 'tenant',
      chapterNumber: 1,
      title: 'Ch 1',
      content: '...',
    });
    expect(chapter).toEqual(mockChapter);
    expect(state.apiClient.post).toHaveBeenCalledWith('/api/comics/c1/chapters', {
      storyId: 's1',
      tenantKey: 'tenant',
      chapterNumber: 1,
      title: 'Ch 1',
      content: '...',
    });
    expect(['uploading', 'draft', 'published']).toContain(chapter.status);

    const urls = await uploadChapterImages([validPng], 'c1', 1);
    expect(realFetcher).toHaveBeenCalledTimes(1);
    const [uploadUrl, uploadInit] = realFetcher.mock.calls[0] as [string, RequestInit];
    expect(uploadUrl).toBe('http://localhost:8787/api/admin/r2/upload');
    expect(uploadInit.method).toBe('POST');
    expect((uploadInit.headers as Record<string, string>)['x-r2-bucket']).toBe('chapters');
    const body = uploadInit.body as FormData;
    expect(body.get('folder')).toBe('chapters');
    expect(body.get('comicId')).toBe('c1');
    expect(body.get('chapterNumber')).toBe('1');
    expect(body.getAll('file')).toHaveLength(1);
    expect(urls).toEqual(['https://r2.example/cover.webp']);
  });
});

describe('F4 x F5 x F6 x F7: real upload-then-create chain', () => {
  it('uploads the cover to the worker gateway, then creates the comic through the api client', async () => {
    seedToken();
    state.apiClient.post.mockResolvedValue({ comic: { id: 'c1', title: 'My Comic' } });

    const coverUrl = await uploadComicCover(validPng);
    expect(coverUrl).toBe('https://r2.example/cover.webp');

    const [url, init] = realFetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:8787/api/admin/r2/upload');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${validJwt}`);
    expect((init.headers as Record<string, string>)['x-r2-bucket']).toBe('covers');
    const body = init.body as FormData;
    expect(body.get('folder')).toBe('covers');
    expect(body.getAll('file')).toHaveLength(1);

    const comic = await createComic({ title: 'My Comic', description: 'Desc', coverUrl });
    expect(state.apiClient.post).toHaveBeenCalledWith('/api/comics', {
      title: 'My Comic',
      description: 'Desc',
      cover_url: 'https://r2.example/cover.webp',
      author: 'Unknown',
      status: 'ongoing',
      category: [],
    });
    expect(comic).toEqual({ id: 'c1', title: 'My Comic' });
  });
});

describe('F1 x F7: CreateComicForm full journey through real services', () => {
  it('uploads, creates, alerts, and routes to the add-chapter screen', async () => {
    seedToken();
    state.apiClient.post.mockResolvedValue({ comic: { id: 'c1', title: 'My Comic' } });
    URL.createObjectURL = vi.fn(() => 'blob:mock-cover');
    URL.revokeObjectURL = vi.fn();

    render(<CreateComicForm />);
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'My Comic' } });
    fireEvent.change(screen.getByPlaceholderText('Description'), {
      target: { value: 'A test comic' },
    });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [validPng] } });
    expect(URL.createObjectURL).toHaveBeenCalledWith(validPng);

    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(state.alert).toHaveBeenCalledWith('Comic created: My Comic'));
    expect(state.push).toHaveBeenCalledWith('/comics/c1/add-chapter?storyId=c1');

    const uploadCall = realFetcher.mock.calls[0] as [string, RequestInit];
    expect(uploadCall[0]).toBe('http://localhost:8787/api/admin/r2/upload');
    expect(state.apiClient.post).toHaveBeenCalledWith(
      '/api/comics',
      expect.objectContaining({ title: 'My Comic' }),
    );
    const uploadOrder = realFetcher.mock.invocationCallOrder[0];
    const createOrder = (
      state.apiClient.post as unknown as { mock: { invocationCallOrder: number[] } }
    ).mock.invocationCallOrder[0];
    expect(uploadOrder).toBeLessThan(createOrder);
  });

  it('rejects an invalid cover type before any upload', async () => {
    render(<CreateComicForm />);
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'My Comic' } });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'bad.txt', { type: 'text/plain' })] },
    });
    await waitFor(() =>
      expect(state.alert).toHaveBeenCalledWith(
        'Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed.',
      ),
    );

    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(state.alert).toHaveBeenCalledWith('Cover image required'));
    expect(realFetcher).not.toHaveBeenCalled();
  });
});

describe('F4 x F6: worker R2 upload route and wrangler bindings', () => {
  it('exposes the R2 upload route and the lightstory-assets bucket binding', () => {
    const adminRoutes = fs.readFileSync(
      path.join(process.cwd(), '..', 'workers', 'kv-worker', 'src', 'routes', 'admin.ts'),
      'utf8',
    );
    expect(adminRoutes).toContain('/admin/r2/upload');
    expect(adminRoutes).toContain('R2_NOT_CONFIGURED');
    expect(adminRoutes).toContain("'covers'");

    const wrangler = fs.readFileSync(
      path.join(process.cwd(), '..', 'workers', 'kv-worker', 'wrangler.jsonc'),
      'utf8',
    );
    expect(wrangler).toContain('R2_BUCKET');
    expect(wrangler).toContain('lightstory-assets');
    expect(wrangler).toContain('SUPABASE_JWKS_URL');
  });
});

describe('F1 x F7: role-based gating of the comic form', () => {
  it('redirects unauthorized roles to the 403 handler and allows admins through', () => {
    state.currentRole = 'user';
    const { container } = render(<CreateComicForm />);
    expect(state.replace).toHaveBeenCalledWith('/handle-exception/403?from=%2Fcomics%2Fnew');
    expect(container.querySelector('input[type="file"]')).toBeNull();

    state.currentRole = 'admin';
    render(<CreateComicForm />);
    expect(document.querySelector('input[type="file"]')).not.toBeNull();
  });
});
