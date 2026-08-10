import { createClient } from '@/lib/api/server';
import { getGatewayUrl } from '@/lib/utils/gateway-url';

export async function fetchApi(path: string, init: RequestInit = {}): Promise<Response> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${getGatewayUrl()}${path}`, { ...init, headers });
}

// ponytail: mirrors apiClient's inline error chain; shared by all action modules
export async function messageFromResponse(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json(); // ponytail: legacy/mock APIs send mixed shapes (string or {code,message}); mirrors apiClient's pattern
    const errObj = body as { error?: unknown; message?: unknown };
    const error =
      typeof errObj.error === 'string'
        ? errObj.error
        : typeof errObj.error === 'object' &&
            errObj.error !== null &&
            typeof (errObj.error as { message?: unknown }).message === 'string'
          ? ((errObj.error as { message: string }).message as string)
          : undefined;
    return (
      error ??
      (typeof errObj.message === 'string' ? errObj.message : undefined) ??
      (res.statusText || `HTTP Error ${res.status}`)
    );
  } catch {
    return res.statusText || `HTTP Error ${res.status}`;
  }
}
