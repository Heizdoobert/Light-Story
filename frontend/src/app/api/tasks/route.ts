import { NextResponse } from 'next/server';
import { taskStore, generateId, mapPaginated, mapTask } from '@/sdk/task/api/_shared';
import { config } from '@/lib/config';
import { createTaskSchema, parseZodError } from '@/sdk/task/validation';
import type { Task, APIError, CreateTaskInput } from '@/sdk/task/types';

/** GET – list tasks with safe pagination */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawPage = Number(url.searchParams.get('page') ?? '1');
  const rawLimit = Number(url.searchParams.get('limit') ?? String(config.PAGE_SIZE));

  // Clamp pagination parameters: page >= 1, 1 <= limit <= 100
  const page = Math.max(1, Number.isFinite(rawPage) ? Math.floor(rawPage) : 1);
  const limit = Math.max(1, Math.min(100, Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 10));

  const all = Object.values(taskStore).filter((v): v is Task => typeof v !== 'function') as Task[];
  const start = (page - 1) * limit;
  const paginated = mapPaginated(
    all.slice(start, start + limit).map(mapTask),
    all.length,
    page,
    limit,
  );
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
    id: generateId(),
    title: data.title,
    description: data.description,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
  taskStore[task.id] = task;
  return NextResponse.json(mapTask(task), { status: 201 });
}
