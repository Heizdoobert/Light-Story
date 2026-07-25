import { supabase } from '@/infrastructure/supabase/client';

export async function getPrivilegedAuthHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};

  try {
    await supabase.auth.getUser();
    const sessionResult = await supabase.auth.getSession();
    const accessToken = sessionResult.data.session?.access_token ?? null;
    if (accessToken) return { Authorization: `Bearer ${accessToken}` };
  } catch {
  }

  try {
    const sessionResult = await supabase.auth.getSession();
    const accessToken = sessionResult.data.session?.access_token ?? null;
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  } catch {
    return {};
  }
}

function getInternalSecretHeader(): Record<string, string> {
  const secret = process.env.NEXT_PUBLIC_INTERNAL_ADMIN_SECRET ?? '';
  if (secret && secret.trim()) return { 'x-internal-secret': secret.trim() };
  return {};
}

export async function getPrivilegedAuthHeadersWithInternal(): Promise<Record<string, string>> {
  const headers = await getPrivilegedAuthHeaders().catch(() => ({}));
  if ('Authorization' in headers) return headers;
  return { ...headers, ...getInternalSecretHeader() };
}
