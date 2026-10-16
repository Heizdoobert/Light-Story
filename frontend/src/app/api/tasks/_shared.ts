// Shared in‑memory store and utilities for the Task API (demo only)
import type { Task } from '@/lib/api/types';

/** In‑memory map of tasks – key is the string id */
export const taskStore = new Map<string, Task>();
let idCounter = 1;

/** Generate a new unique Task id */
export const generateTaskId = (): string => `task-${idCounter++}`;

/** Convert a Task to the public response shape (currently identity) */
export const toResponse = (task: Task) => task;
