import type { z } from 'zod';
import { getErrorMessage } from '@/lib/utils/error-utils';
import { logger } from '@/sdk/logger';
import { ActionUnauthorizedError, ActionForbiddenError, ActionRateLimitError } from '@/lib/security/permission';

export const GENERIC_ACTION_ERROR = 'Request failed. Please try again.';

export const SAFE_ACTION_ERROR_CODES: Readonly<Record<string, string>> = Object.freeze({
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden: insufficient permissions',
  RATE_LIMITED: 'too many requests, please try again later',
  NOT_FOUND: 'Not found.',
  CONFLICT: 'Conflict. Please refresh and try again.',
  VALIDATION_FAILED: 'Invalid input.',
});

const SAFE_PASSTHROUGH_MESSAGES: ReadonlySet<string> = new Set([
  GENERIC_ACTION_ERROR,
  ...Object.values(SAFE_ACTION_ERROR_CODES),
]);

export function publicRunError(result: {
  error: string;
  code?: string;
  details?: unknown;
  requestId?: string;
}): Pick<ActionResult, 'error' | 'code' | 'details' | 'requestId'> {
  const out: Pick<ActionResult, 'error' | 'code' | 'details' | 'requestId'> = {
    error: GENERIC_ACTION_ERROR,
  };
  if (typeof result.code === 'string' && Object.hasOwn(SAFE_ACTION_ERROR_CODES, result.code)) {
    out.error = SAFE_ACTION_ERROR_CODES[result.code];
    out.code = result.code;
  } else if (SAFE_PASSTHROUGH_MESSAGES.has(result.error)) {
    out.error = result.error;
  }
  if (typeof result.requestId === 'string') {
    out.requestId = result.requestId;
  }
  return out;
}

export function publicActionError(err: unknown): string {
  if (
    err instanceof ActionUnauthorizedError ||
    err instanceof ActionForbiddenError ||
    err instanceof ActionRateLimitError
  ) {
    return err.message;
  }
  return GENERIC_ACTION_ERROR;
}

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: unknown;
  requestId?: string;
};

type RunResult<R = unknown> =
  | { ok: true; data?: R }
  | { ok: false; error: string; code?: string; details?: unknown; requestId?: string };

export async function act<T, R = unknown>(
  schema: z.ZodType<T>,
  input: unknown,
  run: (parsed: T) => Promise<RunResult<R>>,
): Promise<ActionResult<R>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
      .join('; ');
    return { success: false, error: `Invalid input: ${detail}` };
  }
  try {
    const result = await run(parsed.data);
    if (result.ok) {
      return { success: true, data: result.data };
    }
    const pub = publicRunError(result);
    if (pub.error !== result.error) {
      try {
        logger.warn('[ServerAction] sanitized upstream error', {
          service: 'server-action',
          upstreamError: result.error,
          code: result.code,
          requestId: result.requestId,
        });
      } catch {
        // Non-blocking error logging
      }
    }
    return {
      success: false,
      error: pub.error,
      ...(pub.code ? { code: pub.code } : {}),
      ...(pub.requestId ? { requestId: pub.requestId } : {}),
    };
  } catch (err) {
    const errorMsg = getErrorMessage(err);
    const errRecord = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : null;
    const reqId =
      (typeof errRecord?.requestId === 'string' ? errRecord.requestId : undefined) ||
      (typeof errRecord?.digest === 'string' ? errRecord.digest : undefined);
    try {
      logger.error(`[ServerAction Error] ${errorMsg}`, {
        service: 'server-action',
        error: err,
        requestId: reqId,
      });
    } catch {
      // Non-blocking error logging
    }
    return {
      success: false,
      error: publicActionError(err),
      ...(reqId ? { requestId: reqId } : {}),
    };
  }
}
