import { NextResponse } from 'next/server';
import { updateTaskSchema, parseZodError } from '@/lib/api/validation';
import type { Task, UpdateTaskInput, APIError } from '@/lib/api/types';
import { taskStore, toResponse } from '@/app/api/tasks/_shared';

/** GET – fetch a task by id */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = taskStore.get(id);
  if (!task) {
    const err: APIError = { code: 'NOT_FOUND', message: 'task_not_found' };
    return NextResponse.json(err, { status: 404 });
  }
  return NextResponse.json(toResponse(task));
}

/** PATCH – partially update a task */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = taskStore.get(id);
  if (!existing) {
    const err: APIError = { code: 'NOT_FOUND', message: 'task_not_found' };
    return NextResponse.json(err, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const err: APIError = { code: 'INVALID_JSON', message: 'invalid_json_body' };
    return NextResponse.json(err, { status: 400 });
  }

  const result = updateTaskSchema.safeParse(body);
  if (!result.success) {
    const err: APIError = parseZodError(result.error);
    return NextResponse.json(err, { status: 422 });
  }

  const data = result.data as UpdateTaskInput;
  const updated: Task = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  taskStore.set(updated.id, updated);
  return NextResponse.json(toResponse(updated));
}

/** DELETE – remove a task */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existed = taskStore.delete(id);
  if (!existed) {
    const err: APIError = { code: 'NOT_FOUND', message: 'task_not_found' };
    return NextResponse.json(err, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
