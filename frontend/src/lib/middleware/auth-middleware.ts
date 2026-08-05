/**
 * Auth middleware: Phase 1 simplification
 * Removes gateway JWKS validation, uses Supabase JWT directly.
 */

import { supabase } from "@/infrastructure/supabase/client";

/**
 * Get current user's auth token directly from Supabase.
 * No gateway JWKS validation needed.
 */
export async function getAuthToken(): Promise<string | null> {
  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Verify token is valid and not expired.
 */
export function verifyTokenNotExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const now = Math.floor(Date.now() / 1000);

    return !payload.exp || now < payload.exp;
  } catch {
    return false;
  }
}

/**
 * Get auth headers for API requests.
 * Automatically includes Supabase JWT token if available.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Check if user is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return token !== null && verifyTokenNotExpired(token);
}

/**
 * Get user ID from current session.
 */
export async function getUserId(): Promise<string | null> {
  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}
