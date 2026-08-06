import { createClient } from '@/lib/api/server';

// ponytail: mirrors apiClient getBaseUrl (apiClient is browser-only); keep in sync when env sources change
const getBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_MOCK === 'true') return 'http://localhost:4010';
  const rawUrl =
    process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION || process.env.NEXT_PUBLIC_GATEWAY_URL
      : process.env.NEXT_PUBLIC_GATEWAY_URL;
  if (!rawUrl) {
    throw new Error(
      `Missing ${process.env.NODE_ENV === 'production' ? 'NEXT_PUBLIC_GATEWAY_URL_PRODUCTION or ' : ''}NEXT_PUBLIC_GATEWAY_URL`,
    );
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
