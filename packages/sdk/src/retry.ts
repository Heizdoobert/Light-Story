import { RetryConfig } from './types';

export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_BACKOFF_BASE_MS = 300;
export const DEFAULT_MAX_DELAY_MS = 5000;
export const DEFAULT_RETRY_STATUS_CODES = [429, 502, 503, 504];
export const DEFAULT_SAFE_METHODS = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'];

export interface ResolvedRetryConfig {
  maxRetries: number;
  backoffBaseMs: number;
  maxDelayMs: number;
  retryStatusCodes: number[];
  retryMethods: string[];
}

export function resolveRetryConfig(config?: boolean | RetryConfig): ResolvedRetryConfig {
  if (config === false) {
    return {
      maxRetries: 0,
      backoffBaseMs: DEFAULT_BACKOFF_BASE_MS,
      maxDelayMs: DEFAULT_MAX_DELAY_MS,
      retryStatusCodes: DEFAULT_RETRY_STATUS_CODES,
      retryMethods: DEFAULT_SAFE_METHODS,
    };
  }

  const userConfig = typeof config === 'object' ? config : {};

  return {
    maxRetries: userConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    backoffBaseMs: userConfig.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS,
    maxDelayMs: userConfig.maxDelayMs ?? DEFAULT_MAX_DELAY_MS,
    retryStatusCodes: userConfig.retryStatusCodes ?? DEFAULT_RETRY_STATUS_CODES,
    retryMethods: userConfig.retryMethods
      ? userConfig.retryMethods.map((m) => m.toUpperCase())
      : DEFAULT_SAFE_METHODS,
  };
}

export function isMethodIdempotent(method: string, safeMethods = DEFAULT_SAFE_METHODS): boolean {
  return safeMethods.includes(method.toUpperCase());
}

export function shouldRetryRequest(
  method: string,
  attempt: number,
  statusOrError: number | Error,
  config: ResolvedRetryConfig,
  optIn?: boolean,
): boolean {
  if (attempt >= config.maxRetries) {
    return false;
  }

  // Caller explicitly disabled retries for this request
  if (optIn === false) {
    return false;
  }

  const upperMethod = method.toUpperCase();
  const isSafe = isMethodIdempotent(upperMethod, config.retryMethods);

  // If method is not safe (e.g. POST), require explicit opt-in (optIn === true)
  if (!isSafe && optIn !== true) {
    return false;
  }

  // If status code is passed
  if (typeof statusOrError === 'number') {
    return config.retryStatusCodes.includes(statusOrError);
  }

  // Network error or fetch exception
  if (statusOrError instanceof Error) {
    // If the error was explicitly aborted by caller signal, do NOT retry
    if (statusOrError.name === 'AbortError' && !(statusOrError as unknown as { isTimeout?: boolean }).isTimeout) {
      return false;
    }
    return true;
  }

  return false;
}

export function calculateRetryDelay(
  attempt: number,
  config: ResolvedRetryConfig,
  headers?: Headers,
): number {
  // Check Retry-After header if present
  if (headers && headers.has('retry-after')) {
    const retryAfter = headers.get('retry-after');
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (!isNaN(seconds) && seconds >= 0) {
        const delayMs = seconds * 1000;
        // If server asks to wait longer than maxDelayMs, do not retry
        if (delayMs > config.maxDelayMs) return -1;
        return delayMs;
      }
      const parsedDate = Date.parse(retryAfter);
      if (!isNaN(parsedDate)) {
        const delayMs = parsedDate - Date.now();
        if (delayMs >= 0) {
          if (delayMs > config.maxDelayMs) return -1;
          return delayMs;
        }
      }
    }
  }

  // Exponential backoff: base * 2^attempt
  const exponentialDelay = config.backoffBaseMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Apply jitter: 50% - 100% of capped delay
  const jitteredDelay = Math.floor(cappedDelay * (0.5 + Math.random() * 0.5));
  return Math.max(jitteredDelay, 10);
}

export function sleepWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(signal.reason ?? new Error('Aborted'));
    }

    const timer = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error('Aborted'));
    }

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}
