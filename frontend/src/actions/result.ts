import type { z } from 'zod';
import { getErrorMessage } from '@/lib/utils/error-utils';
import { logger } from '@/sdk/logger';

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
    return {
      success: false,
      error: result.error,
      ...(result.code ? { code: result.code } : {}),
      ...(result.details ? { details: result.details } : {}),
      ...(result.requestId ? { requestId: result.requestId } : {}),
    };
  } catch (err) {
    const errorMsg = getErrorMessage(err);
    const reqId = (err as any)?.requestId || (err as any)?.digest;
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
      error: errorMsg,
      ...(reqId ? { requestId: reqId } : {}),
    };
  }
}
