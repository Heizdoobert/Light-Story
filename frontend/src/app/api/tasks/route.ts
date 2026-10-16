import { NextResponse } from 'next/server';
import { createTaskSchema, parseZodError } from '@/lib/api/validation';
import type { Task, CreateTaskInput, Paginated, APIError } from '@/lib/api/types';
import { taskStore, generateTaskId, toResponse } from '@/app/api/tasks/_shared';

/** GET – list tasks with safe pagination */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawPage = Number(url.searchParams.get('page') ?? '1');
  const rawLimit = Number(url.searchParams.get('limit') ?? '10');

  // Clamp pagination parameters: page >= 1, 1 <= limit <= 100
  const page = Math.max(1, Number.isFinite(rawPage) ? Math.floor(rawPage) : 1);
  const limit = Math.max(1, Math.min(100, Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 10));

  const all = Array.from(taskStore.values());
  const start = (page - 1) * limit;
  const paginated: Paginated<Task> = {
    items: all.slice(start, start + limit).map(toResponse),
    total: all.length,
    page,
    limit,
  };
  return NextResponse.json(paginated);
}

/** POST – create a new task */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const err: APIError = { code: 'INVALID_JSON', message: 'invalid_json_body' };
    return NextResponse.json(err, { status: 400 });
  }

  const result = createTaskSchema.safeParse(body);
  if (!result.success) {
    const err: APIError = parseZodError(result.error);
    return NextResponse.json(err, { status: 422 });
  }

  const data = result.data as CreateTaskInput;
  const now = new Date().toISOString();
  const task: Task = {
    id: generateTaskId() as any,
    title: data.title,
    description: data.description,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
  taskStore.set(task.id, task);
  return NextResponse.json(toResponse(task), { status: 201 });
}
