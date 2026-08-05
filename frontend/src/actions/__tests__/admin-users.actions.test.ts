import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  updateUserRole,
  updateProfileRole,
  updateUserName,
  updateProfileName,
  updateUserStatus,
  deleteUser,
  createUser,
  manageAdminUser,
} from '../admin-users.actions';
import * as serverApi from '@/lib/api/server';
import { revalidateTag } from 'next/cache';

vi.mock('@/lib/api/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

describe('admin-users.actions server actions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('updateProfileRole / updateUserRole', () => {
    it('updates role and calls revalidateTag("profiles", "max") when valid', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await updateUserRole({ id: 'user-1', role: 'admin' });

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/admin/profiles');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ action: 'updateRole', id: 'user-1', role: 'admin' });
      expect(revalidateTag).toHaveBeenCalledWith('profiles', 'max');
    });

    it('returns error on invalid input', async () => {
      const res = await updateProfileRole({ id: '', role: '' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid input');
      expect(revalidateTag).not.toHaveBeenCalled();
    });
  });

  describe('updateProfileName / updateUserName', () => {
    it('updates name and calls revalidateTag("profiles", "max") when valid', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await updateUserName({ id: 'user-1', full_name: 'John Doe' });

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/admin/profiles');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ action: 'updateName', id: 'user-1', full_name: 'John Doe' });
      expect(revalidateTag).toHaveBeenCalledWith('profiles', 'max');
    });

    it('supports updateProfileName directly', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await updateProfileName({ id: 'user-1', full_name: 'Jane Doe' });
      expect(res.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('profiles', 'max');
    });
  });

  describe('updateUserStatus', () => {
    it('updates status and calls revalidateTag("profiles", "max") when valid', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await updateUserStatus({ id: 'user-1', status: 'active' });

      expect(res.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('profiles', 'max');
    });
  });

  describe('deleteUser & createUser & manageAdminUser', () => {
    it('deletes user successfully', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await deleteUser({ id: 'user-1', email: 'test@example.com' });

      expect(res.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('profiles', 'max');
    });

    it('creates user successfully via createUser and manageAdminUser', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await createUser({
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
        role: 'user',
      });

      expect(res.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('profiles', 'max');
    });

    it('calls manageAdminUser directly', async () => {
      vi.mocked(serverApi.createClient).mockResolvedValue({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'valid-token' } },
          }),
        },
      } as any);

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
      vi.stubGlobal('fetch', mockFetch);

      const res = await manageAdminUser({ action: 'delete', id: 'user-123' });
      expect(res.success).toBe(true);
      expect(revalidateTag).toHaveBeenCalledWith('profiles', 'max');
    });
  });
});
