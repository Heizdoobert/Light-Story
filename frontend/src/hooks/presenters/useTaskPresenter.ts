// src/hooks/presenters/useTaskPresenter.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, CreateTaskInput, UpdateTaskInput, Paginated, APIError } from '@/lib/api/types';

/** Helper for GET list */
export const useTaskList = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['tasks', page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?page=${page}&limit=${limit}`);
      if (!res.ok) {
        const err = await res.json();
        throw err as APIError;
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
        const err = await res.json();
        throw err as APIError;
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
        const err = await res.json();
        throw err as APIError;
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
        const err = await res.json();
        throw err as APIError;
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
        const err = await res.json();
        throw err as APIError;
      }
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};
