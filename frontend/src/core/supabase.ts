// This file initializes the Supabase client for the entire application
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let lastErrorRedirectAt = 0;

const getRequestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const isSupabaseApiRequest = (url: string): boolean => {
  return url.includes('/rest/v1/') || url.includes('/functions/v1/') || url.includes('/storage/v1/');
};

const getErrorRouteFromStatus = (status: number): string | null => {
  if (status === 400) return '/400';
  if (status === 401) return '/401';
  if (status === 403) return '/403';
  if (status === 404) return '/404';
  if (status >= 500) return '/503';
  return null;
};

const maybeRedirectToErrorPage = (status: number) => {
  if (typeof window === 'undefined') return;

  const targetPath = getErrorRouteFromStatus(status);
  if (!targetPath) return;
  if (window.location.pathname === targetPath) return;

  const now = Date.now();
  if (now - lastErrorRedirectAt < 1500) return;

  lastErrorRedirectAt = now;
  window.location.replace(targetPath);
};

const supabaseFetch: typeof fetch = async (input, init) => {
  try {
    const response = await fetch(input, init);
    if (!response.ok) {
      const requestUrl = getRequestUrl(input);
      const skipRedirect = response.status === 404 && isSupabaseApiRequest(requestUrl);
      if (!skipRedirect) {
        maybeRedirectToErrorPage(response.status);
      }
    }
    return response;
  } catch (error) {
    maybeRedirectToErrorPage(503);
    throw error;
  }
};

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey, {
      global: {
        fetch: supabaseFetch,
      },
    }) 
  : null;

if (!supabase) {
  console.warn('Supabase credentials missing. RBAC and Data fetching will be disabled.');
}
