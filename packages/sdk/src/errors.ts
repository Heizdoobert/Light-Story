/**
 * Custom error classes for @light-story/sdk.
 */

export class GatewayError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, message: string, code: string = 'GATEWAY_ERROR', details?: unknown) {
    super(message);
    this.name = 'GatewayError';
    this.status = status;
    this.code = code;
    this.details = details;

    Object.setPrototypeOf(this, GatewayError.prototype);
  }

  static fromResponse(status: number, data: unknown, fallbackMessage?: string): GatewayError {
    let message = fallbackMessage || `Gateway request failed with status ${status}`;
    let code = 'GATEWAY_ERROR';
    let details: unknown = undefined;

    let parsed = data;
    if (typeof data === 'string' && data.trim()) {
      try {
        parsed = JSON.parse(data.trim());
      } catch {
        message = data.trim();
      }
    }

    if (parsed && typeof parsed === 'object') {
      const errObj = parsed as {
        error?: string | { code?: string; message?: string; details?: unknown };
        message?: string;
        code?: string;
      };

      if (errObj.message && typeof errObj.message === 'string') {
        message = errObj.message;
      }

      if (typeof errObj.error === 'string') {
        message = errObj.error;
      } else if (errObj.error && typeof errObj.error === 'object') {
        if (errObj.error.message) message = errObj.error.message;
        if (errObj.error.code) code = errObj.error.code;
        if (errObj.error.details) details = errObj.error.details;
      }

      if (errObj.code && typeof errObj.code === 'string') {
        code = errObj.code;
      }
    }

    // Standard status-based code mapping when code is generic
    if (code === 'GATEWAY_ERROR') {
      if (status === 400) code = 'BAD_REQUEST';
      else if (status === 401) code = 'UNAUTHORIZED';
      else if (status === 403) code = 'FORBIDDEN';
      else if (status === 404) code = 'NOT_FOUND';
      else if (status === 409) code = 'CONFLICT';
      else if (status === 429) code = 'RATE_LIMITED';
      else if (status >= 500) code = 'SERVER_ERROR';
    }

    return new GatewayError(status, message, code, details);
  }
}

export class SdkTimeoutError extends GatewayError {
  constructor(timeoutMs: number, url?: string) {
    super(
      408,
      `Request timed out after ${timeoutMs}ms${url ? ` (${url})` : ''}`,
      'TIMEOUT_ERROR',
      { timeoutMs, url },
    );
    this.name = 'SdkTimeoutError';
    Object.setPrototypeOf(this, SdkTimeoutError.prototype);
  }
}

export class SdkNetworkError extends GatewayError {
  constructor(message: string, cause?: unknown) {
    super(0, message || 'Network request failed', 'NETWORK_ERROR', cause);
    this.name = 'SdkNetworkError';
    Object.setPrototypeOf(this, SdkNetworkError.prototype);
  }
}
