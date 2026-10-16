import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('next/server', () => {
  class MockNextResponse extends Response {
    static json(data: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
      });
    }
  }
  return { NextResponse: MockNextResponse };
});

import { GET, POST } from '@/app/api/tasks/route';
import { GET as GET_ONE, PATCH, DELETE } from '@/app/api/tasks/[id]/route';
import { taskStore } from '@/app/api/tasks/_shared';
import type { Task, Paginated, APIError } from '@/lib/api/types';

describe('Task Management API (integration tests)', () => {
  beforeEach(() => {
    taskStore.clear();
  });

  it('performs full CRUD lifecycle: create, list, fetch, update, delete', async () => {
    // 1. CREATE
    const createReq = new Request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Task 1', description: 'Integration test task' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const createRes = await POST(createReq);
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as Task;
    expect(created.id).toMatch(/^task-\d+$/);
    expect(created.title).toBe('Task 1');
    expect(created.description).toBe('Integration test task');
    expect(created.completed).toBe(false);
    expect(created.createdAt).toBeDefined();
    expect(created.updatedAt).toBeDefined();

    // 2. LIST (pagination)
    const listReq = new Request('http://localhost/api/tasks?page=1&limit=10');
    const listRes = await GET(listReq);
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as Paginated<Task>;
    expect(list.total).toBe(1);
    expect(list.page).toBe(1);
    expect(list.limit).toBe(10);
    expect(list.items).toHaveLength(1);
    expect(list.items[0].id).toBe(created.id);

    // 3. GET BY ID
    const getRes = await GET_ONE(new Request(`http://localhost/api/tasks/${created.id}`), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(getRes.status).toBe(200);
    const fetched = (await getRes.json()) as Task;
    expect(fetched.id).toBe(created.id);
    expect(fetched.title).toBe('Task 1');

    // 4. UPDATE (PATCH)
    const patchReq = new Request(`http://localhost/api/tasks/${created.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Task 1 Updated', completed: true }),
      headers: { 'Content-Type': 'application/json' },
    });
    const patchRes = await PATCH(patchReq, {
      params: Promise.resolve({ id: created.id }),
    });
    expect(patchRes.status).toBe(200);
    const updated = (await patchRes.json()) as Task;
    expect(updated.title).toBe('Task 1 Updated');
    expect(updated.completed).toBe(true);

    // 5. DELETE
    const deleteRes = await DELETE(new Request(`http://localhost/api/tasks/${created.id}`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(deleteRes.status).toBe(204);

    // Verify deletion
    const afterDeleteRes = await GET_ONE(new Request(`http://localhost/api/tasks/${created.id}`), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(afterDeleteRes.status).toBe(404);
    const err = (await afterDeleteRes.json()) as APIError;
    expect(err.code).toBe('NOT_FOUND');
  });

  it('safely clamps pagination parameters', async () => {
    // Negative page and excessive limit
    const listReq1 = new Request('http://localhost/api/tasks?page=-5&limit=999');
    const listRes1 = await GET(listReq1);
    expect(listRes1.status).toBe(200);
    const list1 = (await listRes1.json()) as Paginated<Task>;
    expect(list1.page).toBe(1);
    expect(list1.limit).toBe(100);

    // Non-numeric query params
    const listReq2 = new Request('http://localhost/api/tasks?page=invalid&limit=xyz');
    const listRes2 = await GET(listReq2);
    expect(listRes2.status).toBe(200);
    const list2 = (await listRes2.json()) as Paginated<Task>;
    expect(list2.page).toBe(1);
    expect(list2.limit).toBe(10);
  });

  it('returns 400 INVALID_JSON when body cannot be parsed as JSON', async () => {
    const malformedReq = new Request('http://localhost/api/tasks', {
      method: 'POST',
      body: 'invalid-json{',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(malformedReq);
    expect(res.status).toBe(400);
    const err = (await res.json()) as APIError;
    expect(err.code).toBe('INVALID_JSON');
  });

  it('returns 422 VALIDATION_ERROR on invalid creation payload', async () => {
    const badReq = new Request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: '' }), // empty string fails min(1)
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(badReq);
    expect(res.status).toBe(422);
    const err = (await res.json()) as APIError;
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('validation_error');
    expect(err.details).toBeDefined();
    expect(err.details?.title).toBeDefined();
  });

  it('returns 422 VALIDATION_ERROR on invalid update payload', async () => {
    // Create valid task first
    const createReq = new Request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Valid Task' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const createRes = await POST(createReq);
    const created = (await createRes.json()) as Task;

    // Send invalid update: completed not boolean
    const badPatchReq = new Request(`http://localhost/api/tasks/${created.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: 'not-a-bool' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const patchRes = await PATCH(badPatchReq, {
      params: Promise.resolve({ id: created.id }),
    });
    expect(patchRes.status).toBe(422);
    const err = (await patchRes.json()) as APIError;
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 INVALID_JSON on PATCH with malformed body', async () => {
    const createReq = new Request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Valid Task' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const createRes = await POST(createReq);
    const created = (await createRes.json()) as Task;

    const malformedPatch = new Request(`http://localhost/api/tasks/${created.id}`, {
      method: 'PATCH',
      body: '{bad-json',
      headers: { 'Content-Type': 'application/json' },
    });
    const patchRes = await PATCH(malformedPatch, {
      params: Promise.resolve({ id: created.id }),
    });
    expect(patchRes.status).toBe(400);
    const err = (await patchRes.json()) as APIError;
    expect(err.code).toBe('INVALID_JSON');
  });

  it('returns 404 when updating non-existent task', async () => {
    const patchReq = new Request('http://localhost/api/tasks/task-999', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New Title' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(patchReq, {
      params: Promise.resolve({ id: 'task-999' }),
    });
    expect(res.status).toBe(404);
    const err = (await res.json()) as APIError;
    expect(err.code).toBe('NOT_FOUND');
  });

  it('returns 404 when deleting non-existent task', async () => {
    const res = await DELETE(new Request('http://localhost/api/tasks/task-999', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'task-999' }),
    });
    expect(res.status).toBe(404);
    const err = (await res.json()) as APIError;
    expect(err.code).toBe('NOT_FOUND');
  });
});
