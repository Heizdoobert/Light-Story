import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSessionClient } from '@/lib/server';
import { getServerSupabase, getServerSupabaseForRequest } from '@/lib/supabase/server';

export type RouteRequester =
  | { ok: true; id: string; role: string }
  | { ok: false; status?: number };

export type ResolveRouteRequesterOptions = {
  allowAnonymousFallback?: boolean;
  anonymousRole?: string;
};

export type RequireRouteAuthorizationOptions = ResolveRouteRequesterOptions & {
  allowedRoles?: readonly string[];
  unauthorizedStatus?: number;
  forbiddenStatus?: number;
  unauthorizedMessage?: string;
  forbiddenMessage?: string;
};

export const DEFAULT_ROUTE_ROLES = ['admin', 'superadmin', 'internal'] as const;

function resolveRequesterRole(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function resolveRole(
  request: NextRequest | { headers: { get(name: string): string | null } },
  userId: string,
  userData: any,
): Promise<string | undefined> {
  // First try to get role from app_metadata (fastest, no DB query)
  const appMetadataRole = resolveRequesterRole(userData.user?.app_metadata?.role);
  if (appMetadataRole) return appMetadataRole;

  // Fall back to profiles table if no app_metadata role
  try {
    const supabase = getServerSupabaseForRequest(request) ?? getServerSupabase();
    if (supabase) {
      const { data } = await supabase.from('profiles').select('id,role').eq('id', userId).maybeSingle();
      const profileRole = resolveRequesterRole(data?.role);
      if (profileRole) return profileRole;
    }
  } catch (err) {
    // If profiles query fails, continue with other methods
    console.warn('Failed to resolve role from profiles table:', err);
  }

  return undefined;
}

async function tryBearerRequester(request: NextRequest): Promise<RouteRequester | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const authClient = supabaseUrl && supabaseKey ? createSupabaseClient(supabaseUrl, supabaseKey) : null;

  const authorization = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ') || !authClient) return null;

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) return null;

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const userId = userData.user?.id;
  if (userError || !userId) return null;

  const role = await resolveRole(request, userId, userData);
  if (!role) return null;

  return { ok: true, id: userId, role };
}

async function trySessionRequester(request: NextRequest): Promise<RouteRequester | null> {
  const sessionClient = await createSessionClient();
  const { data: userData, error: userError } = await sessionClient.auth.getUser();
  const userId = userData.user?.id;
  if (userError || !userId) return null;

  const role = await resolveRole(request, userId, userData);
  if (!role) return null;

  return { ok: true, id: userId, role };
}

export function isAllowedRouteRole(role: string, allowedRoles: readonly string[] = DEFAULT_ROUTE_ROLES): boolean {
  // Superadmin always has access to everything
  if (role === 'superadmin') return true;
  return allowedRoles.includes(role);
}

export async function resolveRouteRequester(
  request: NextRequest,
  options: ResolveRouteRequesterOptions = {},
): Promise<RouteRequester> {
  const internalSecret = request.headers.get('x-internal-secret');
  if (internalSecret && process.env.INTERNAL_ADMIN_SECRET && internalSecret === process.env.INTERNAL_ADMIN_SECRET) {
    return { ok: true, id: 'internal', role: 'internal' };
  }

  try {
    const bearerRequester = await tryBearerRequester(request);
    if (bearerRequester?.ok) return bearerRequester;

    const sessionRequester = await trySessionRequester(request);
    if (sessionRequester?.ok) return sessionRequester;

    if (options.allowAnonymousFallback) {
      return { ok: true, id: 'anonymous', role: options.anonymousRole ?? 'employee' };
    }

    return { ok: false };
  } catch {
    if (options.allowAnonymousFallback) {
      return { ok: true, id: 'anonymous', role: options.anonymousRole ?? 'employee' };
    }

    return { ok: false };
  }
}

export async function requireRouteAuthorization(
  request: NextRequest,
  options: RequireRouteAuthorizationOptions = {},
): Promise<{ ok: true; requester: { id: string; role: string } } | { ok: false; response: NextResponse }> {
  const requester = await resolveRouteRequester(request, options);
  if (!requester.ok) {
    return {
      ok: false,
      response: createErrorResponse(options.unauthorizedMessage ?? 'unauthorized', options.unauthorizedStatus ?? 401),
    };
  }

  const allowedRoles = options.allowedRoles ?? DEFAULT_ROUTE_ROLES;
  if (!isAllowedRouteRole(requester.role, allowedRoles)) {
    return {
      ok: false,
      response: createErrorResponse(
        options.forbiddenMessage ?? 'forbidden: insufficient permissions',
        options.forbiddenStatus ?? 403,
      ),
    };
  }

  return { ok: true, requester };
}