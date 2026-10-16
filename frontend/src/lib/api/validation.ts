import { z } from 'zod';

/** Zod schema for creating a task */
export const createTaskSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().optional(),
});

/** Zod schema for updating a task – all fields optional */
export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  completed: z.boolean().optional(),
});

/** Helper to parse and return validation errors in APIError format */
export const parseZodError = (error: z.ZodError) => {
  const issues = (error.issues || (error as unknown as { errors: z.ZodIssue[] }).errors || []);
  return {
    code: 'VALIDATION_ERROR',
    message: 'validation_error', // i18n key
    details: issues.reduce((acc: Record<string, string>, cur: z.ZodIssue) => {
      acc[cur.path.join('.')] = cur.message;
      return acc;
    }, {} as Record<string, string>),
  };
};
