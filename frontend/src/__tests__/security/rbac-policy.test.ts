import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTION_ADMIN_ROLES, SETTINGS_ADMIN_ROLES, SUPERADMIN_ROLES, requireActionRole, ActionForbiddenError, ActionUnauthorizedError } from '@/lib/security/permission';
import { createCategory } from '@/lib/actions/categories.actions';

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), fetchApi: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ createClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser } })) }));
vi.mock('@/actions/http', () => ({ fetchApi: mocks.fetchApi }));
vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag }));

const session = (role: string) => ({ id: 'policy-user', app_metadata: { role } });
const roles = ['superadmin', 'admin', 'employee', 'user', 'reader', 'root'];
const grants: Record<string, readonly string[]> = {
  content: ['superadmin', 'admin', 'employee'], settings: ['superadmin', 'admin'], users: ['superadmin'],
};
const tiers = [
  { name: 'content', allowed: ACTION_ADMIN_ROLES },
  { name: 'settings', allowed: SETTINGS_ADMIN_ROLES },
  { name: 'users', allowed: SUPERADMIN_ROLES },
];
const invalidIdentities: Array<[string, unknown, unknown]> = [
  ['missing user', null, null],
  ['missing id', { app_metadata: { role: 'admin' } }, null],
  ['missing role', { id: 'policy-user', app_metadata: {} }, null],
  ['nonstring role', { id: 'policy-user', app_metadata: { role: 42 } }, null],
  ['editable metadata only', { id: 'policy-user', user_metadata: { role: 'admin' } }, null],
  ['auth error', session('superadmin'), new Error('invalid session')],
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.fetchApi.mockResolvedValue(new Response(JSON.stringify({ id: 'category-test' }), { status: 200 }));
});
afterEach(() => vi.restoreAllMocks());

describe('RBAC policy matrix', () => {
  for (const { name, allowed } of tiers) {
    it.each(roles)(`${name} permits only its documented roles: %s`, async (role) => {
      mocks.getUser.mockResolvedValue({ data: { user: session(role) }, error: null });
      const decision = requireActionRole(allowed);
      if (grants[name].includes(role)) {
        await expect(decision).resolves.toEqual({ userId: 'policy-user', role });
      } else {
        await expect(decision).rejects.toBeInstanceOf(ActionForbiddenError);
      }
    });
  }
  it.each(invalidIdentities)('rejects untrusted identity: %s', async (_label, user, error) => {
    mocks.getUser.mockResolvedValue({ data: { user }, error });
    await expect(requireActionRole(ACTION_ADMIN_ROLES)).rejects.toBeInstanceOf(ActionUnauthorizedError);
  });
});

describe('real category action authorization', () => {
  it.each(['employee', 'admin', 'superadmin'])('allows category creation for %s', async (role) => {
    mocks.getUser.mockResolvedValue({ data: { user: session(role) }, error: null });
    await expect(createCategory({ name: 'RBAC test' })).resolves.toEqual({ success: true, data: { id: 'category-test' } });
    expect(mocks.fetchApi).toHaveBeenCalledExactlyOnceWith('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name: 'RBAC test' }) });
    expect(mocks.revalidateTag).toHaveBeenCalledOnce();
  });
  const denials: Array<[string, unknown, string]> = [
    ...['user', 'reader', 'root'].map((role): [string, unknown, string] => [role, session(role), 'forbidden: insufficient permissions']),
    ['missing session', null, 'unauthorized'],
    ['editable metadata spoof', { id: 'policy-user', user_metadata: { role: 'superadmin' } }, 'unauthorized'],
  ];
  it.each(denials)('prevents API writes and cache invalidation: %s', async (_label, user, error) => {
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    await expect(createCategory({ name: 'RBAC test' })).resolves.toEqual({ success: false, error });
    expect(mocks.fetchApi).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});
