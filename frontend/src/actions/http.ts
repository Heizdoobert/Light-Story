import { createClient } from '@/lib/api/server';

// ponytail: mirrors apiClient getBaseUrl (apiClient is browser-only); keep in sync when env sources change
const getBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_MOCK === 'true') return 'http://localhost:4010';
  let rawUrl = '';
  if (process.env.NODE_ENV === 'production') {
    rawUrl =
      process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION ||
      process.env.NEXT_PUBLIC_GATEWAY_URL ||
      'https://kv-worker.hhhuygiau.workers.dev';
  } else {
    rawUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8787';
  }
  return rawUrl.replace(/\/+$/, '');
};

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
  return fetch(`${getBaseUrl()}${path}`, { ...init, headers });
}

// ponytail: mirrors apiClient's inline error chain; shared by all action modules
export async function messageFromResponse(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return (
      (typeof body?.error === 'string' ? body.error : undefined) ??
      body?.error?.message ??
      body?.message ??
      (res.statusText || `HTTP Error ${res.status}`)
    );
  } catch {
    return res.statusText || `HTTP Error ${res.status}`;
  }
}
