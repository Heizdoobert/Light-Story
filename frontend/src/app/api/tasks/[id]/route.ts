import { NextResponse } from 'next/server';
import { updateTaskSchema, parseZodError } from '@/sdk/task/validation';
import type { Task, UpdateTaskInput, APIError } from '@/sdk/task/types';
import { taskStore, mapTask } from '@/sdk/task/api/_shared';

/** GET – fetch a task by id */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = taskStore[id];
  if (!task) {
    const err: APIError = { code: 'NOT_FOUND', message: 'task_not_found' };
    return NextResponse.json(err, { status: 404 });
  }
  return NextResponse.json(mapTask(task));
}

/** PATCH – partially update a task */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = taskStore[id];
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
  taskStore[id] = updated;
  return NextResponse.json(mapTask(updated));
}

/** DELETE – remove a task */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(id in taskStore)) {
    const err: APIError = { code: 'NOT_FOUND', message: 'task_not_found' };
    return NextResponse.json(err, { status: 404 });
  }
  delete taskStore[id];
  return new NextResponse(null, { status: 204 });
}
