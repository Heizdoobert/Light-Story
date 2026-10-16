// src/lib/sdk/httpClient.ts
// Core HTTP client wrapper SDK used across the Light‑Story project (frontend and Cloudflare Workers).
// Provides type‑safe request/response handling, automatic retries with exponential back‑off,
// auth‑header injection, timeout/cancelation, and structured logging.

export interface HttpRequestInit<T = any> extends RequestInit {
  /** JSON‑serializable request body */
  json?: T;
  /** Optional timeout in milliseconds (default 5000) */
  timeout?: number;
  /** Number of retry attempts (default 2) */
  retries?: number;
  /** Base delay for exponential back‑off in ms (default 200) */
  backoffBase?: number;
  /** Abort controller for manual cancellation */
  signal?: AbortSignal;
}

export interface HttpResponse<R = any> {
  /** Parsed JSON response (if applicable) */
  data: R;
  /** HTTP status code */
  status: number;
  /** Original Response object for advanced use */
  raw: Response;
}
// Simple logger interface – can be swapped for a custom logger
export interface Logger {
  debug(message?: any, ...optionalParams: any[]): void;
  error(message?: any, ...optionalParams: any[]): void;
}

// Default logger that proxies to console
const defaultLogger: Logger = {
  debug: (...args) => console.debug(...args),
  error: (...args) => console.error(...args),
};

/**
 * Core fetch wrapper that works in both the browser and Cloudflare Workers.
 * It automatically JSON‑stringifies the `json` field, sets appropriate headers,
 * applies a timeout, retries on network errors and 5xx responses, and injects
 * an Authorization header if a token is supplied via `getAuthToken`.
 */
export async function httpRequest<T = any, R = any>(
  input: RequestInfo,
  init: HttpRequestInit<T> = {}
): Promise<HttpResponse<R>> {
  const {
    json,
    timeout = 5000,
    retries = 2,
    backoffBase = 200,
    headers = {},
    signal,
    ...restInit
  } = init;

  // Prepare headers and body
  const finalHeaders: HeadersInit = new Headers(headers);
  let body: BodyInit | null = null;
  if (json !== undefined) {
    finalHeaders.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  // Inject auth token if available
  const token = await getAuthToken();
  if (token) {
    finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  // Helper to perform a single fetch with timeout
  // Helper to perform a single fetch with timeout and merged abort signals
  const fetchWithTimeout = async (attempt: number): Promise<Response> => {
    // Controller for the timeout
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

    // Merge external signal (if any) with timeout signal
    let finalSignal: AbortSignal;
    if (signal) {
      const combinedController = new AbortController();
      const onAbort = () => combinedController.abort();
      signal.addEventListener('abort', onAbort);
      timeoutController.signal.addEventListener('abort', onAbort);
      finalSignal = combinedController.signal;
    } else {
      finalSignal = timeoutController.signal;
    }

    try {
      const response = await fetch(input, {
        ...restInit,
        method: restInit.method ?? 'GET',
        headers: finalHeaders,
        body,
        signal: finalSignal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Retry loop with exponential back‑off
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(attempt);
      if (!response.ok && response.status >= 500 && attempt < retries) {
        // Server error – retry
        const delay = backoffBase * 2 ** attempt;
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      const contentType = response.headers.get('content-type');
      const data = contentType?.includes('application/json')
        ? (await response.json())
        : (await response.text());
      // Structured logging – simple console for now (replace with your logger later)
      console.debug('httpRequest', {
        url: input,
        method: restInit.method ?? 'GET',
        status: response.status,
        attempt,
      });
      return { data, status: response.status, raw: response } as HttpResponse<R>;
    } catch (err) {
      // Network error or timeout
      if (attempt < retries) {
        const delay = backoffBase * 2 ** attempt;
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      console.error('httpRequest failed', { url: input, error: err, attempt });
      throw err;
    }
  }
  // Should never reach here
  throw new Error('httpRequest: exhausted retries without a response');
}

/**
 * Placeholder for obtaining the current auth token.
 * In the real codebase replace this with the actual Supabase auth helper
 * (e.g., from `frontend/src/lib/supabase/client.ts`).
 */
async function getAuthToken(): Promise<string | null> {
  // TODO: integrate with existing auth context / supabase client
  // For now return null to keep SDK dependency‑free.
  return null;
}

export default { httpRequest };
