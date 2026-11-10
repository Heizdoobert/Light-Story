// SDK: In-memory store and utilities for Task Management API
import type { Task, Paginated } from '@/sdk/task/types';

// Simple incrementing ID generator
let lastId = 0;
export const generateId = (): string => {
  lastId += 1;
  return `task-${lastId}`;
};

// In-memory store with clear method for tests
export const taskStore: Record<string, Task> & { clear: () => void } = Object.assign(
  {} as Record<string, Task>,
  {
    clear: () => {
      for (const key of Object.keys(taskStore)) {
        if (key !== 'clear') delete taskStore[key];
      }
    },
  }
);

// Mapper helpers - keep API shape stable
export const mapTask = (task: Task) => task;

export const mapPaginated = (items: Task[], total: number, page: number, limit: number): Paginated<Task> => ({
  items,
  total,
  page,
  limit,
});
