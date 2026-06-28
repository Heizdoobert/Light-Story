/** Lightweight body validation for route handlers */

export const VALID_STATUSES = ['draft', 'published', 'ongoing', 'completed', 'archived'] as const;

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
  return trimmed.slice(0, maxLength);
}

function normalizeStatus(status: string): string {
  if (VALID_STATUSES.includes(status as any)) return status;
  return 'draft';
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
        }
        break;
      }
      case 'optional-string': {
        if (value !== undefined && value !== null && typeof value !== 'string') {
          errors.push({ field: rule.field, message: `${rule.field} must be a string` });
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
        sanitized[rule.field] = validateString(value, rule.maxLength ?? 500) ?? '';
        break;
      }
      case 'optional-string': {
        if (value !== undefined && value !== null && typeof value === 'string') {
          sanitized[rule.field] = value.trim().slice(0, rule.maxLength ?? 500);
        }
        break;
      }
      case 'enum': {
        if (value !== undefined && value !== null) {
          sanitized[rule.field] = normalizeStatus(String(value));
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
