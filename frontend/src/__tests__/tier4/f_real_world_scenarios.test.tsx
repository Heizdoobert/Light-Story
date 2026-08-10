import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { GET } from '@/app/api/health/route';
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';
import { handleAdminRequest } from '../../../../workers/kv-worker/src/routes/admin';

const mocks = vi.hoisted(() => {
  return {
    mockPush: vi.fn(),
    mockReplace: vi.fn(),
    mockAuth: {
      user: { id: 'u1' } as { id: string } | null,
      role: undefined as string | undefined,
      loading: false as boolean,
    },
    mockPathname: '/comics/create',
  };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mocks.mockAuth,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.mockPush, replace: mocks.mockReplace }),
  usePathname: () => mocks.mockPathname,
}));

const multipart = (parts: { name: string; filename?: string; contentType?: string; value: string }[], boundary = 'test-boundary') => {
  const chunks: string[] = [];
  for (const p of parts) {
    chunks.push(`--${boundary}`);
    chunks.push(`Content-Disposition: form-data; name="${p.name}"${p.filename ? `; filename="${p.filename}"` : ''}`);
    if (p.contentType) chunks.push(`Content-Type: ${p.contentType}`);
    chunks.push('');
    chunks.push(p.value);
  }
  chunks.push(`--${boundary}--`);
  return chunks.join('\r\n');
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockAuth.user = { id: 'u1' };
  mocks.mockAuth.role = 'employee';
  mocks.mockAuth.loading = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Journey 2: Role-based route protection', () => {
  it('redirects logged-out users to the 401 exception page', () => {
    mocks.mockAuth.user = null;
    mocks.mockAuth.role = undefined;
    render(
      <RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'employee']}>
        <div>Admin Panel</div>
      </RoleProtectedRoute>,
    );
    expect(mocks.mockReplace).toHaveBeenCalledWith('/handle-exception/401?from=%2Fcomics%2Fcreate');
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('redirects authenticated users with insufficient role to the 403 page', () => {
    mocks.mockAuth.user = { id: 'u2' };
    mocks.mockAuth.role = 'user';
    render(
      <RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'employee']}>
        <div>Admin Panel</div>
      </RoleProtectedRoute>,
    );
    expect(mocks.mockReplace).toHaveBeenCalledWith('/handle-exception/403?from=%2Fcomics%2Fcreate');
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('renders children for an authenticated employee', () => {
    render(
      <RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'employee']}>
        <div>Admin Panel</div>
      </RoleProtectedRoute>,
    );
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(mocks.mockReplace).not.toHaveBeenCalled();
  });

  it('shows nothing and does not redirect while auth state is loading', () => {
    mocks.mockAuth.loading = true;
    render(
      <RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'employee']}>
        <div>Admin Panel</div>
      </RoleProtectedRoute>,
    );
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    expect(mocks.mockReplace).not.toHaveBeenCalled();
  });
});

describe('Journey 4: Health check API', () => {
  it('returns 200 with status ok and a recent ISO timestamp', async () => {
    const before = Date.now();
    const res = await GET();
    const body = (await res.json()) as { status: string; timestamp: string };
    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    const ts = Date.parse(body.timestamp);
    expect(Number.isFinite(ts)).toBe(true);
    expect(ts).toBeGreaterThanOrEqual(before - 1000);
    expect(ts).toBeLessThanOrEqual(Date.now() + 1000);
  });
});

describe('Journey 6: Gateway worker contract for R2 upload', () => {
  const makeRequest = (parts: { name: string; filename?: string; contentType?: string; value: string }[], opts: { contentType?: string; role?: string } = {}) =>
    new Request('https://kv-worker.hhhuygiau.workers.dev/api/admin/r2/upload', {
      method: 'POST',
      headers: {
        'Content-Type': opts.contentType ?? 'multipart/form-data; boundary=test-boundary',
        'x-user-role': opts.role ?? 'admin',
      },
      body: parts.length > 0 ? multipart(parts) : '',
    });

  const testEnv = (put: unknown) => ({
    R2_BUCKET: { put },
    SUPABASE_URL: 'https://db.supabase.co',
    SUPABASE_SERVICE_KEY: 'service-role-key',
  });

  it('stores a cover under covers/{comicId}.png and returns a media URL', async () => {
    const put = vi.fn().mockResolvedValue({});
    const request = makeRequest([
      { name: 'file', filename: 'cover.png', contentType: 'image/png', value: 'fake-png-bytes' },
      { name: 'folder', value: 'covers' },
      { name: 'comicId', value: 'comic-1' },
    ]);
    const res = await handleAdminRequest(request, testEnv(put), 'token', '/admin/r2/upload');
    expect(res!.status).toBe(200);
    expect(await res!.json()).toEqual({ success: true, data: { urls: ['/api/media/covers/comic-1.png'] } });
    expect(put).toHaveBeenCalledWith(
      'covers/comic-1.png',
      expect.any(ArrayBuffer),
      expect.objectContaining({
        httpMetadata: expect.objectContaining({
          contentType: 'image/png',
          cacheControl: 'public, max-age=31536000, immutable',
        }),
        customMetadata: expect.objectContaining({
          uploadedBy: 'admin',
          folder: 'covers',
          originalName: 'cover.png',
        }),
      }),
    );
  });

  it('rejects non-multipart requests with 400', async () => {
    const request = makeRequest([], { contentType: 'application/json', role: 'admin' });
    const res = await handleAdminRequest(request, testEnv(vi.fn()), 'token', '/admin/r2/upload');
    expect(res!.status).toBe(400);
    expect(await res!.json()).toEqual({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Expected multipart/form-data' },
    });
  });

  it('rejects multipart uploads with no files with 400', async () => {
    const request = makeRequest([{ name: 'folder', value: 'covers' }], { role: 'admin' });
    const res = await handleAdminRequest(request, testEnv(vi.fn()), 'token', '/admin/r2/upload');
    expect(res!.status).toBe(400);
    expect(await res!.json()).toEqual({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'No files provided' },
    });
  });

  it('rejects requests from users without an admin role with 403', async () => {
    const request = makeRequest([
      { name: 'file', filename: 'cover.png', contentType: 'image/png', value: 'x' },
    ], { role: 'viewer' });
    const res = await handleAdminRequest(request, testEnv(vi.fn()), 'token', '/admin/r2/upload');
    expect(res!.status).toBe(403);
  });

  it('frontend service and worker agree on the upload contract (fs inspection)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const repoRoot = path.resolve(__dirname, '../../../../');
    const serviceSource = fs.readFileSync(path.join(repoRoot, 'frontend/src/services/comics/comic.service.ts'), 'utf-8');
    const adminSource = fs.readFileSync(path.join(repoRoot, 'workers/kv-worker/src/routes/admin.ts'), 'utf-8');

    expect(serviceSource).toContain('fetch(`${getGatewayUrl()}${ROUTES.API.ADMIN.R2_UPLOAD_GATEWAY}`');
    expect(serviceSource).toContain("headers['x-r2-bucket'] = bucket");
    expect(serviceSource).toContain("headers['Authorization'] = `Bearer ${token}`");
    expect(serviceSource).toContain("form.append('file', file)");
    expect(serviceSource).toContain("form.append('folder', options.folder)");
    expect(serviceSource).toContain("form.append('comicId', options.comicId)");
    expect(serviceSource).toContain("form.append('userId', options.userId)");

    expect(adminSource).toContain("formData.getAll('file')");
    expect(adminSource).toContain('`covers/${comicId}.${ext}`');
    expect(adminSource).toContain('uploadedUrls.push(`/api/media/${key}`)');
    expect(adminSource).toContain('json({ success: true, data: { urls: uploadedUrls } })');
    expect(adminSource).toContain("customMetadata: {");
  });
});

const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

describe.skipIf(!hasSupabaseEnv)('Journey 7: Real-environment guard (requires Supabase env vars)', () => {
  it('runs only when NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeTruthy();
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeTruthy();
  });
});
