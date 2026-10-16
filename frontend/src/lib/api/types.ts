/*
 * API type definitions for Task Management
 * All user‑facing strings should be referenced via i18n keys (see `frontend/src/lib/i18n/translations.ts`).
 */

// Branded ID for strong typing
export const TASK_ID_BRAND = Symbol('TaskId');
export type TaskId = string & { __brand: typeof TASK_ID_BRAND };

/**
 * Core Task entity stored in the in‑memory store.
 */
export interface Task {
  id: TaskId;
  title: string;
  description?: string;
  completed: boolean;
  /** ISO‑8601 timestamp */
  createdAt: string;
  /** ISO‑8601 timestamp */
  updatedAt: string;
}

/** Input for creating a task. */
export interface CreateTaskInput {
  title: string;
  description?: string;
}

/** Input for updating a task – all fields are optional. */
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  completed?: boolean;
}

/** Generic pagination wrapper. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** Unified API error shape. */
export interface APIError {
  /** Machine‑readable error code */
  code: string;
  /** Human‑readable message (i18n key) */
  message: string;
  /** Optional details, e.g. validation errors */
  details?: Record<string, unknown>;
}
