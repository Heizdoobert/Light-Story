// src/hooks/presenters/useTaskPresenter.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, CreateTaskInput, UpdateTaskInput, Paginated, APIError } from '@/sdk/task/types';

const parseApiError = async (res: Response): Promise<APIError> => {
  try {
    const data = await res.json();
    if (data && typeof data === 'object' && 'code' in data) {
      return data as APIError;
    }
  } catch {
    // fallback if non-JSON body
  }
  return {
    code: 'HTTP_ERROR',
    message: res.statusText || 'request_failed',
    details: { status: res.status },
  };
};

/** Helper for GET list */
export const useTaskList = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['tasks', page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?page=${page}&limit=${limit}`);
      if (!res.ok) {
        throw await parseApiError(res);
      }
      return (await res.json()) as Paginated<Task>;
    },
  });
};

/** Helper for GET by id */
export const useTask = (id: string) => {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${id}`);
      if (!res.ok) {
        throw await parseApiError(res);
      }
      return (await res.json()) as Task;
    },
  });
};

/** Create task */
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        throw await parseApiError(res);
      }
      return (await res.json()) as Task;
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
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw await parseApiError(res);
      }
      return (await res.json()) as Task;
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
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw await parseApiError(res);
      }
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};
