import type { z } from 'zod';
import { getErrorMessage } from '@/lib/utils/errorUtils';

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

type RunResult<R = unknown> = { ok: true; data?: R } | { ok: false; error: string };

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
    return result.ok ? { success: true, data: result.data } : { success: false, error: result.error };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}
