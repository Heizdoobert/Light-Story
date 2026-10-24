// src/hooks/presenters/useTaskPresenter.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, CreateTaskInput, UpdateTaskInput, Paginated, APIError } from '@/sdk/task/types';

/** Helper to parse API errors */
const parseApiError = async (res: Response): Promise<APIError> => {
  try {
    const data = await res.json();
    if (data && typeof data === 'object' && 'code' in data) return data as APIError;
  } catch {
    // ignore parsing errors
  }
  return { code: 'HTTP_ERROR', message: res.statusText || 'request_failed', details: { status: res.status } };
};

/** Generic request helper using fetch */
const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await parseApiError(res);
    throw err;
  }
  return (await res.json()) as T;
};

/** Helper for GET list */
export const useTaskList = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['tasks', page, limit],
    queryFn: () => request<Paginated<Task>>(`/api/tasks?page=${page}&limit=${limit}`),
  });
};

/** Helper for GET by id */
export const useTask = (id: string) => {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => request<Task>(`/api/tasks/${id}`),
  });
};

/** Create task */
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const res = await request<Task>('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

/** Update task */
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskInput }) => {
      const res = await request<Task>(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

/** Delete task */
export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await request<void>(`/api/tasks/${id}`, { method: 'DELETE' });
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};
