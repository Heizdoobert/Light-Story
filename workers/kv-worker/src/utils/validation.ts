/** Lightweight body validation for route handlers */

export const VALID_STATUSES = ['draft', 'published', 'ongoing', 'completed', 'archived'] as const;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export interface ValidationError {
  field: string;
  message: string;
}

export type ValidationRule = {
  field: string;
  type: 'required-string' | 'optional-string' | 'enum' | 'optional-array';
  maxLength?: number;
  enumValues?: readonly string[];
};

function validateString(value: unknown, maxLength = 500): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

function normalizeStatus(status: string): string {
  if (VALID_STATUSES.includes(status as any)) return status;
  return status;
}

export function validateBody(body: Record<string, unknown>, rules: ValidationRule[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    const value = body[rule.field];

    switch (rule.type) {
      case 'required-string': {
        const str = validateString(value, rule.maxLength ?? 500);
        if (str === null) {
          errors.push({ field: rule.field, message: `${rule.field} is required and must be a non-empty string` });
        } else if (rule.maxLength && str.length > rule.maxLength) {
          errors.push({ field: rule.field, message: `${rule.field} must be at most ${rule.maxLength} characters` });
        }
        break;
      }
      case 'optional-string': {
        if (value !== undefined && value !== null) {
          if (typeof value !== 'string' && typeof value !== 'number') {
            errors.push({ field: rule.field, message: `${rule.field} must be a string` });
          } else {
            const str = String(value).trim();
            if (rule.maxLength && str.length > rule.maxLength) {
              errors.push({ field: rule.field, message: `${rule.field} must be at most ${rule.maxLength} characters` });
            }
          }
        }
        break;
      }
      case 'enum': {
        if (value === undefined || value === null) break;
        const str = String(value);
        const normalized = normalizeStatus(str);
        if (!rule.enumValues?.includes(normalized)) {
          errors.push({ field: rule.field, message: `${rule.field} must be one of: ${rule.enumValues?.join(', ') || VALID_STATUSES.join(', ')}` });
        }
        break;
      }
      case 'optional-array': {
        if (value !== undefined && value !== null && !Array.isArray(value)) {
          errors.push({ field: rule.field, message: `${rule.field} must be an array` });
        }
        break;
      }
    }
  }

  return errors;
}

export function sanitizeBody(body: Record<string, unknown>, rules: ValidationRule[]): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const rule of rules) {
    const value = body[rule.field];

    switch (rule.type) {
      case 'required-string': {
        const strVal = validateString(value, rule.maxLength ?? 500) ?? '';
        sanitized[rule.field] = strVal.slice(0, rule.maxLength ?? 500);
        break;
      }
      case 'optional-string': {
        if (value !== undefined && value !== null) {
          const strVal = String(value).trim();
          sanitized[rule.field] = strVal.slice(0, rule.maxLength ?? 500);
        }
        break;
      }
      case 'enum': {
        if (value !== undefined && value !== null) {
          const status = String(value);
          sanitized[rule.field] = VALID_STATUSES.includes(status as any) ? status : 'draft';
        }
        break;
      }
      case 'optional-array': {
        if (Array.isArray(value)) {
          sanitized[rule.field] = value;
        }
        break;
      }
    }
  }

  return sanitized;
}

export function getAuthRole(request: Request): string | null {
  return request.headers.get('x-user-role');
}

export function requireRole(role: string | null, allowed: string[]): boolean {
  return role !== null && allowed.includes(role);
}

export const APP_ROLES = ['superadmin', 'admin', 'employee', 'user', 'haunt'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);
}

/**
 * Thrown by the ID guards below. Route modules already wrap their whole body in
 * one try/catch; that catch maps this to HTTP 400 so the guard does not have to
 * be repeated at every call site.
 */
export class ValidationFailure extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'ValidationFailure';
    this.field = field;
  }
}

/** Returns the value unchanged, or throws. Use for IDs going into a URL path or an RPC argument. */
export function assertUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !isValidUuid(value)) {
    throw new ValidationFailure(field, `${field} must be a UUID`);
  }
  return value;
}

/**
 * Builds a PostgREST equality filter. Every id interpolated into a query string
 * must go through here: these queries run with the service key, so RLS is not a
 * second line of defence and an operator smuggled into the value (`neq.<uuid>`)
 * would widen the row set.
 */
export function uuidFilter(column: string, value: unknown): string {
  return `${column}=eq.${assertUuid(value, column)}`;
}

/** Builds a PostgREST `in.(...)` filter for bulk operations. */
export function uuidInFilter(column: string, values: unknown): string {
  if (!Array.isArray(values) || values.length === 0) {
    throw new ValidationFailure(column, `${column} must be a non-empty array`);
  }
  const checked = values.map((v) => assertUuid(v, column));
  return `${column}=in.(${checked.join(',')})`;
}

/**
 * Builds a PostgREST equality filter for an identifier-shaped column (setting
 * keys, not UUIDs). Same contract as uuidFilter: the interpolation happens
 * inside the guard, never at the call site.
 */
export function identifierFilter(column: string, value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_]+$/.test(value)) {
    throw new ValidationFailure(column, `${column} must be an alphanumeric identifier`);
  }
  return `${column}=eq.${value}`;
}
