/**
 * Custom error class for errors thrown by the Gateway SDK.
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

      if (typeof errObj.error === 'string') {
        message = errObj.error;
      } else if (errObj.error && typeof errObj.error === 'object') {
        if (errObj.error.message) message = errObj.error.message;
        if (errObj.error.code) code = errObj.error.code;
        if (errObj.error.details) details = errObj.error.details;
      }

      if (errObj.message && typeof errObj.message === 'string') {
        message = errObj.message;
      }
      if (errObj.code && typeof errObj.code === 'string') {
        code = errObj.code;
      }
    }

    return new GatewayError(status, message, code, details);
  }
}
