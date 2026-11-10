import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ACTION_ADMIN_ROLES,
  requireActionRole,
  ActionUnauthorizedError,
  ActionForbiddenError,
  ActionRateLimitError,
  checkActionRateLimit,
} from '@/lib/security/permission';
import { z } from 'zod';

// Mock server session client
const mockGetUser = vi.fn();
vi.mock('@/lib/api/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// Sample schema matching server actions validation
const testActionPayloadSchema = z.object({
  comicId: z.string().min(1, 'comicId is required'),
  title: z.string().min(3, 'title must be at least 3 characters').max(100),
  status: z.enum(['draft', 'published']),
});

async function mockServerAction(payload: unknown) {
  // 1. Role verification
  const requester = await requireActionRole(ACTION_ADMIN_ROLES);
  // 2. Zod schema validation
  const validated = testActionPayloadSchema.parse(payload);
  return { success: true, requester, data: validated };
}

describe('Server Actions Security & Validation Suites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireActionRole(ACTION_ADMIN_ROLES) authorization checks', () => {
    it('throws ActionUnauthorizedError when no user session is found', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Session not found'),
      });

      await expect(requireActionRole(ACTION_ADMIN_ROLES)).rejects.toThrow(
        ActionUnauthorizedError
      );
    });

    it('throws ActionUnauthorizedError when user exists but has no role metadata', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'usr-1', app_metadata: {} } },
        error: null,
      });

      await expect(requireActionRole(ACTION_ADMIN_ROLES)).rejects.toThrow(
        ActionUnauthorizedError
      );
    });

    it('throws ActionForbiddenError when user role is not authorized in ACTION_ADMIN_ROLES', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'usr-2', app_metadata: { role: 'reader' } } },
        error: null,
      });

      await expect(requireActionRole(ACTION_ADMIN_ROLES)).rejects.toThrow(
        ActionForbiddenError
      );
    });

    it('succeeds for allowed roles in ACTION_ADMIN_ROLES (e.g. admin, superadmin, employee)', async () => {
      for (const role of ACTION_ADMIN_ROLES) {
        mockGetUser.mockResolvedValueOnce({
          data: { user: { id: `usr-${role}`, app_metadata: { role } } },
          error: null,
        });

        const result = await requireActionRole(ACTION_ADMIN_ROLES);
        expect(result.role).toBe(role);
        expect(result.userId).toBe(`usr-${role}`);
      }
    });
  });

  describe('Zod schema validation in Server Actions', () => {
    beforeEach(() => {
      // Mock authorized admin session
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'admin-1', app_metadata: { role: 'admin' } } },
        error: null,
      });
    });

    it('rejects payload with missing required fields', async () => {
      const invalidPayload = { title: 'Valid Title' };
      await expect(mockServerAction(invalidPayload)).rejects.toThrow(z.ZodError);
    });

    it('rejects payload with invalid string lengths or formats', async () => {
      const shortTitlePayload = { comicId: 'c1', title: 'ab', status: 'draft' };
      await expect(mockServerAction(shortTitlePayload)).rejects.toThrow(z.ZodError);
    });

    it('rejects payload with invalid enum values', async () => {
      const invalidEnumPayload = { comicId: 'c1', title: 'Valid Title', status: 'archived' };
      await expect(mockServerAction(invalidEnumPayload)).rejects.toThrow(z.ZodError);
    });

    it('executes successfully when role is authorized and payload is valid', async () => {
      const validPayload = { comicId: 'c-101', title: 'Valid Comic Title', status: 'published' };
      const res = await mockServerAction(validPayload);
      expect(res.success).toBe(true);
      expect(res.requester.role).toBe('admin');
      expect(res.data.title).toBe('Valid Comic Title');
    });
  });

  describe('Server Actions Anti-Spam & Rate Limiting', () => {
    it('allows requests within limit and rejects excess calls', () => {
      const testKey = `test-user-${Date.now()}`;
      expect(checkActionRateLimit(testKey, 2, 60_000)).toBe(true);
      expect(checkActionRateLimit(testKey, 2, 60_000)).toBe(true);
      expect(checkActionRateLimit(testKey, 2, 60_000)).toBe(false);
    });

    it('throws ActionRateLimitError when requireActionRole exceeds rate limit', async () => {
      const spamUserId = `spam-user-${Date.now()}`;
      mockGetUser.mockResolvedValue({
        data: { user: { id: spamUserId, app_metadata: { role: 'admin' } } },
        error: null,
      });

      // 2 allowed calls
      await expect(
        requireActionRole(ACTION_ADMIN_ROLES, { limit: 2, windowMs: 60_000 })
      ).resolves.toBeDefined();
      await expect(
        requireActionRole(ACTION_ADMIN_ROLES, { limit: 2, windowMs: 60_000 })
      ).resolves.toBeDefined();

      // 3rd call exceeds limit
      await expect(
        requireActionRole(ACTION_ADMIN_ROLES, { limit: 2, windowMs: 60_000 })
      ).rejects.toThrow(ActionRateLimitError);
    });
  });
});
