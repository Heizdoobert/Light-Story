// SDK: Types and DTOs for Task Management API
export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string; // ISO‑8601 timestamp
  updatedAt: string; // ISO‑8601 timestamp
}

export interface CreateTaskInput {
  title: string;
  description?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  completed?: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface APIError {
  code: string;
  message: string; // i18n key
  details?: Record<string, unknown>;
  status?: number;
}
