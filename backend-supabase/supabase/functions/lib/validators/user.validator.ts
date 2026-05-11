import { z } from 'zod';

const BaseAction = z.object({
  action: z.enum(['create', 'delete']),
});

const CreateAction = BaseAction.extend({
  action: z.literal('create'),
  email: z.string().email('email must be a valid email'),
  password: z.string().min(6, 'password must be at least 6 characters'),
  role: z.enum(['superadmin', 'admin', 'employee', 'user']),
  fullName: z.string().min(1).max(200).optional(),
});

const DeleteAction = BaseAction.extend({
  action: z.literal('delete'),
  userId: z.string().uuid().optional(),
  targetEmail: z.string().email().optional(),
}).refine((val) => Boolean(val.userId) || Boolean(val.targetEmail), {
  message: 'Either userId or targetEmail must be provided for delete',
  path: ['userId', 'targetEmail'],
});

export const UserActionSchema = z.discriminatedUnion('action', [CreateAction, DeleteAction]);

export type CreateUserInput = z.infer<typeof CreateAction>;
export type DeleteUserInput = z.infer<typeof DeleteAction>;
export type UserAction = z.infer<typeof UserActionSchema>;
