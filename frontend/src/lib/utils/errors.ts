/**
 * Centralized error types for Phase 1 simplification.
 * Replaces scattered error handling across services.
 */

export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  constructor(
    message: string,
    details?: Record<string, any>,
  ) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(
    resource: string,
    id?: string,
  ) {
    super(
      'NOT_FOUND',
      `${resource}${id ? ` (${id})` : ''} not found`,
    );
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ApiError extends DomainError {
  constructor(
    public status: number,
    code: string,
    message: string,
    public correlationId?: string,
  ) {
    super(code, message);
    this.name = 'ApiError';
  }
}
