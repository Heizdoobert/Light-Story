const SENSITIVE_KEY_PATTERN =
  /(password|passwd|secret|token|api_?key|auth|authorization|bearer|credential|credit_?card|private_?key)/i;

const REDACTED_VALUE = '[REDACTED]';

/**
 * Recursively redacts sensitive keys from a metadata object to prevent credential leakage.
 */
export function redactMetadata<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value as object)) {
    return '[Circular]' as unknown as T;
  }
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => redactMetadata(item, seen)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = REDACTED_VALUE;
    } else if (val && typeof val === 'object') {
      result[key] = redactMetadata(val, seen);
    } else {
      result[key] = val;
    }
  }

  return result as T;
}
