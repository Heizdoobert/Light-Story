/** Admin endpoint handler */

import {
  Env,
  err,
  sbGet,
  sbPost,
  sbPatch,
  sbDelete,
  sbGetCount,
  handleRes,
  json,
} from '../utils/supabase-client';
import {
  validateBody,
  sanitizeBody,
  getAuthRole,
  requireRole,
  VALID_STATUSES,
} from '../utils/validation';

export async function handleAdminRequest(
  request: Request,
  env: Env,
  token: string | null,
  pathname: string,
): Promise<Response | null> {
  const url = new URL(request.url);
  const method = request.method;
  const path = pathname;

  try {
    if (method === 'POST' && path === '/admin/manage-story') {
      const body = (await request.json()) as any;
      const { action } = body;

      if (action === 'create' || (!action && body.story)) {
        const s = body.story || body;
        const payload: Record<string, unknown> = {
          title: s.title,
          author: s.author,
          description: s.description || null,
          cover_url: s.cover_url || null,
          status: s.status || 'draft',
          category: s.category || null,
          category_id: s.category_id || null,
          author_id: s.author_id || null,
        };
        const res = await sbPost('stories', payload, env, token);
        return handleRes(res);
      }

      if (action === 'update') {
        const res = await sbPatch(
          'stories',
          `id=eq.${body.id}`,
          body.payload,
          env,
          token,
        );
        return handleRes(res);
      }

      if (action === 'delete') {
        const res = await sbDelete(
          'stories',
          `id=eq.${body.id}`,
          env,
          token,
        );
        return res.ok
          ? json({ success: true })
          : handleRes(res);
      }

      if (action === 'bulkUpdateStatus') {
        const { ids, status: newStatus } = body;
        const queries = ids
          .map((id: string) => `id=eq.${id}`)
          .join(',');
        const res = await sbPatch(
          'stories',
          `or=(${queries})`,
          { status: newStatus },
          env,
          token,
        );
        return res.ok
          ? json({ success: true })
          : handleRes(res);
      }

      if (action === 'bulkDelete') {
        const queries = body.ids
          .map((id: string) => `id=eq.${id}`)
          .join(',');
        const res = await sbDelete(
          'stories',
          `or=(${queries})`,
          env,
          token,
        );
        return res.ok
          ? json({ success: true })
          : handleRes(res);
      }

      return err(
        'BAD_REQUEST',
        'Unknown manage-story action',
        400,
      );
    }

    if (method === 'POST' && path === '/admin/manage-chapter') {
      const body = (await request.json()) as any;
      const { action } = body;

      if (action === 'create' || (!action && body.chapter)) {
        const c = body.chapter || body;
        const payload = {
          story_id: c.story_id,
          chapter_number: c.chapter_number,
          title: c.title,
          content: c.content || '',
        };
        const res = await sbPost('chapters', payload, env, token);
        return handleRes(res);
      }

      if (action === 'update') {
        const res = await sbPatch(
          'chapters',
          `id=eq.${body.id}`,
          body.payload,
          env,
          token,
        );
        return handleRes(res);
      }

      if (action === 'delete') {
        const res = await sbDelete(
          'chapters',
          `id=eq.${body.id}`,
          env,
          token,
        );
        return res.ok
          ? json({ success: true })
          : handleRes(res);
      }

      return err(
        'BAD_REQUEST',
        'Unknown manage-chapter action',
        400,
      );
    }

    if (method === 'POST' && path === '/admin/audit') {
      const body = (await request.json()) as any;
      const userId = request.headers.get('x-user-id');
      const payload = {
        user_id: userId || null,
        action: body.action,
        entity_type: body.entity_type || 'comic',
        entity_id: body.entity_id || body.comicId || null,
        metadata: body.metadata || {},
      };
      const res = await sbPost('audit_logs', payload, env, token);
      return res.ok
        ? json({ success: true })
        : handleRes(res);
    }

    if (method === 'GET' && path === '/admin/audit') {
      const limit = Math.min(
        500,
        Math.max(1, parseInt(url.searchParams.get('limit') || '200')),
      );
      const q = `select=id,user_id,action,entity_type,entity_id,metadata,created_at&order=created_at.desc&limit=${limit}`;
      const res = await sbGet('audit_logs', q, env, token);
      return handleRes(res);
    }

    if (method === 'GET' && path === '/admin/site-settings') {
      const keys = url.searchParams.get('keys');
      const scope = url.searchParams.get('scope');
      let q = 'select=key,value';
      if (keys) {
        const keyList = keys
          .split(',')
          .map((k) => `key=eq.${k.trim()}`)
          .join(',');
        q += `&or=(${keyList})`;
      }
      if (scope === 'admin') {
        q += '&key=like.admin_*';
      } else if (scope === 'public') {
        q += '&key=like.public_*';
      }
      const res = await sbGet('site_settings', q, env, token);
      return handleRes(res);
    }

    if (method === 'POST' && path === '/admin/site-settings') {
      const body = (await request.json()) as any;
      const userId = request.headers.get('x-user-id');
      if (body.payload && Array.isArray(body.payload)) {
        const results = [];
        for (const item of body.payload) {
          const upsertRes = await sbPost(
            'site_settings',
            {
              key: item.key,
              value: item.value,
              updated_by: userId || null,
            },
            env,
            token,
          );
          results.push(
            await upsertRes.json().catch(() => ({})),
          );
        }
        return json({ success: true, results });
      }
      const res = await sbPost(
        'site_settings',
        {
          key: body.key,
          value: body.value,
          updated_by: userId || null,
        },
        env,
        token,
      );
      return handleRes(res);
    }

    if (method === 'GET' && path === '/admin/taxonomy') {
      const entity = url.searchParams.get('entity');
      if (entity === 'category') {
        const res = await sbGet(
          'categories',
          'select=id,name,description,created_at,updated_at&order=name.asc',
          env,
          token,
        );
        return handleRes(res);
      }
      if (entity === 'author') {
        const res = await sbGet(
          'authors',
          'select=id,name,bio,created_at,updated_at&order=name.asc',
          env,
          token,
        );
        return handleRes(res);
      }
      return err(
        'BAD_REQUEST',
        'Unknown taxonomy entity',
        400,
      );
    }

    if (
      method === 'GET' &&
      path === '/admin/stories/field-values'
    ) {
      const field = url.searchParams.get('field');
      if (field !== 'category' && field !== 'author_id') {
        return err('BAD_REQUEST', 'Unknown field', 400);
      }
      const res = await sbGet(
        'stories',
        `select=${field}&limit=1000`,
        env,
        token,
      );
      return handleRes(res);
    }

    if (method === 'POST' && path === '/admin/taxonomy') {
      const body = (await request.json()) as any;
      const { entity, action: taxAction, id: taxId, payload: taxPayload } = body;

      if (entity === 'category') {
        if (taxAction === 'create') {
          const res = await sbPost(
            'categories',
            taxPayload,
            env,
            token,
          );
          return handleRes(res);
        }
        if (taxAction === 'update') {
          const res = await sbPatch(
            'categories',
            `id=eq.${taxId}`,
            taxPayload,
            env,
            token,
          );
          return handleRes(res);
        }
        if (taxAction === 'delete') {
          const res = await sbDelete(
            'categories',
            `id=eq.${taxId}`,
            env,
            token,
          );
          return res.ok
            ? json({ success: true })
            : handleRes(res);
        }
      }

      if (entity === 'author') {
        if (taxAction === 'create') {
          const res = await sbPost(
            'authors',
            taxPayload,
            env,
            token,
          );
          return handleRes(res);
        }
        if (taxAction === 'update') {
          const res = await sbPatch(
            'authors',
            `id=eq.${taxId}`,
            taxPayload,
            env,
            token,
          );
          return handleRes(res);
        }
        if (taxAction === 'delete') {
          const res = await sbDelete(
            'authors',
            `id=eq.${taxId}`,
            env,
            token,
          );
          return res.ok
            ? json({ success: true })
            : handleRes(res);
        }
      }

      return err(
        'BAD_REQUEST',
        `Unknown taxonomy entity or action: ${entity}/${taxAction}`,
        400,
      );
    }

    if (
      method === 'GET' &&
      path === '/admin/role-distribution'
    ) {
      const res = await sbGet(
        'profiles',
        'select=role&limit=10000',
        env,
        token,
      );
      const profiles = (await res.json()) as Array<{
        role: string;
      }>;
      if (!Array.isArray(profiles)) return json({ data: [] });
      const distribution: Record<string, number> = {};
      for (const p of profiles) {
        distribution[p.role] = (distribution[p.role] || 0) + 1;
      }
      const data = Object.entries(distribution).map(
        ([role, total]) => ({ role, total }),
      );
      return json(data);
    }

    if (
      method === 'GET' &&
      path === '/admin/site-metrics'
    ) {
      const type = url.searchParams.get('type');
      if (type === 'profiles') {
        const count = await sbGetCount(
          'profiles?select=id',
          env,
          token,
        );
        return json({ count });
      }
      if (type === 'chapters') {
        const count = await sbGetCount(
          'chapters?select=id',
          env,
          token,
        );
        return json({ count });
      }
      if (type === 'site-settings') {
        const count = await sbGetCount(
          'site_settings?select=id',
          env,
          token,
        );
        return json({ count });
      }
      return err(
        'BAD_REQUEST',
        'Unknown metric type',
        400,
      );
    }

    if (
      method === 'GET' &&
      path === '/admin/analytics/dashboard'
    ) {
      const range = url.searchParams.get('range') || '7d';
      const storiesRes = await sbGet(
        'stories',
        'select=id,title,author,views,like_count,status,created_at&limit=5&order=created_at.desc',
        env,
        token,
      );
      const stories = storiesRes.ok
        ? await storiesRes.json()
        : [];
      const viewsRes = await sbGet(
        'stories',
        'select=views&limit=10000',
        env,
        token,
      );
      const views = viewsRes.ok
        ? await viewsRes.json()
        : [];
      const totalViews = Array.isArray(views)
        ? views.reduce(
            (sum: number, row: { views?: number }) =>
              sum + (Number(row.views) || 0),
            0,
          )
        : 0;
      const totalStories = await sbGetCount(
        'stories?select=id',
        env,
        token,
      );
      const totalChapters = await sbGetCount(
        'chapters?select=id',
        env,
        token,
      );
      const activeStories = await sbGetCount(
        'stories?select=id&status=neq.draft&status=neq.archived',
        env,
        token,
      );
      return json({
        stories,
        stats: {
          totalStories,
          totalChapters,
          activeStories,
          totalViews,
        },
        range,
      });
    }

    if (method === 'POST' && path === '/admin/profiles') {
      const body = (await request.json()) as any;
      const { action, id } = body;

      if (action === 'updateRole') {
        const res = await sbPatch(
          'profiles',
          `id=eq.${id}`,
          { role: body.role },
          env,
          token,
        );
        return res.ok
          ? json({ success: true })
          : handleRes(res);
      }

      if (action === 'updateName') {
        const res = await sbPatch(
          'profiles',
          `id=eq.${id}`,
          { full_name: body.full_name },
          env,
          token,
        );
        return res.ok
          ? json({ success: true })
          : handleRes(res);
      }

      return err(
        'BAD_REQUEST',
        'Unknown profile action',
        400,
      );
    }

    if (method === 'POST' && path === '/admin/manage-user') {
      const body = (await request.json()) as any;
      const { action } = body;
      const svcKey = env.SUPABASE_SERVICE_KEY;

      if (!svcKey) {
        return err(
          'NOT_CONFIGURED',
          'SUPABASE_SERVICE_KEY not set',
          500,
        );
      }

      if (action === 'create') {
        const adminRes = await fetch(
          `${env.SUPABASE_URL}/auth/v1/admin/users`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: svcKey,
              Authorization: `Bearer ${svcKey}`,
            },
            body: JSON.stringify({
              email: body.email,
              password: body.password,
              email_confirm: true,
              user_metadata: {
                full_name: body.full_name || '',
                role: body.role || 'user',
              },
            }),
          },
        );
        const adminData = await adminRes.json();
        if (!adminRes.ok)
          return err(
            'ADMIN_ERROR',
            adminData.msg || adminData.error || 'Create user failed',
            adminRes.status,
          );
        return json({ data: adminData });
      }

      if (action === 'delete') {
        const adminRes = await fetch(
          `${env.SUPABASE_URL}/auth/v1/admin/users/${body.id}`,
          {
            method: 'DELETE',
            headers: {
              apikey: svcKey,
              Authorization: `Bearer ${svcKey}`,
            },
          },
        );
        if (!adminRes.ok) {
          const adminData = await adminRes.json().catch(() => ({}));
          return err(
            'ADMIN_ERROR',
            adminData.msg || adminData.error || 'Delete user failed',
            adminRes.status,
          );
        }
        return json({ success: true });
      }

      return err(
        'BAD_REQUEST',
        'Unknown manage-user action',
        400,
      );
    }

    if (method === 'GET' && path === '/admin/profiles') {
      const page = Math.max(
        1,
        parseInt(url.searchParams.get('page') || '1'),
      );
      const pageSize = Math.min(
        100,
        Math.max(1, parseInt(url.searchParams.get('pageSize') || '50')),
      );
      const offset = (page - 1) * pageSize;
      const q = `select=id,email,role,full_name,created_at&order=created_at.desc&limit=${pageSize}&offset=${offset}`;
      const res = await sbGet('profiles', q, env, token);
      return handleRes(res);
    }

    if (method === 'GET' && path === '/admin/profiles/by-ids') {
      const ids = (url.searchParams.get('ids') || '')
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
      if (ids.length === 0) return json({ data: [] });
      const q = `select=id,email,full_name&order=created_at.desc&limit=500&id=in.(${ids.map(encodeURIComponent).join(',')})`;
      const res = await sbGet('profiles', q, env, token);
      return handleRes(res);
    }

    if (
      method === 'DELETE' &&
      path.match(/^\/admin\/profiles\/[^\/]+$/)
    ) {
      const id = path.split('/')[3];
      const res = await sbDelete(
        'profiles',
        `id=eq.${id}`,
        env,
        token,
      );
      return res.ok
        ? json({ success: true })
        : handleRes(res);
    }

    // ── Comic CMS CRUD ─────────────────────────────────────

    if (method === 'POST' && path === '/admin/upload-to-r2') {
      const bucket = env.R2_BUCKET;
      if (!bucket) {
        return err('R2_NOT_CONFIGURED', 'R2 bucket not bound', 500);
      }
      const contentType = request.headers.get('Content-Type') || '';
      if (!contentType.includes('multipart/form-data')) {
        return err('BAD_REQUEST', 'Expected multipart/form-data', 400);
      }
      const formData = await request.formData();
      const fileEntries = formData.getAll('file') as File[];
      if (fileEntries.length === 0) {
        return err('BAD_REQUEST', 'No files provided', 400);
      }
      const uploadedUrls: string[] = [];
      for (const file of fileEntries) {
        const ext = file.name.split('.').pop() || 'png';
        const key = `uploads/${crypto.randomUUID()}.${ext}`;
        await bucket.put(key, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type || 'application/octet-stream' },
        });
        uploadedUrls.push(`/api/admin/r2/${key}`);
      }
      return json({ success: true, data: { urls: uploadedUrls } });
    }

    if (method === 'POST' && path === '/admin/comics') {
      const role = getAuthRole(request);
      if (!requireRole(role, ['superadmin', 'admin', 'employee'])) {
        return err('FORBIDDEN', 'Staff role required', 403);
      }

      const body = (await request.json()) as Record<string, unknown>;
      const errors = validateBody(body, [
        { field: 'title', type: 'required-string', maxLength: 200 },
        { field: 'author', type: 'optional-string', maxLength: 100 },
        { field: 'description', type: 'optional-string', maxLength: 2000 },
        { field: 'status', type: 'enum', enumValues: VALID_STATUSES },
        { field: 'coverUrl', type: 'optional-string', maxLength: 1000 },
      ]);
      if (errors.length > 0) {
        return err('VALIDATION_ERROR', errors.map(e => `${e.field}: ${e.message}`).join('; '), 400);
      }

      const s = sanitizeBody(body, [
        { field: 'title', type: 'required-string', maxLength: 200 },
        { field: 'author', type: 'optional-string', maxLength: 100 },
        { field: 'description', type: 'optional-string', maxLength: 2000 },
        { field: 'status', type: 'enum', enumValues: VALID_STATUSES },
        { field: 'coverUrl', type: 'optional-string', maxLength: 1000 },
      ]);

      const payload: Record<string, unknown> = {
        title: s.title,
        author: (s.author as string) || 'Unknown',
        description: (s.description as string) || null,
        status: s.status || 'draft',
      };
      if (s.coverUrl) payload.cover_url = s.coverUrl;
      const res = await sbPost('stories', payload, env, token);
      return handleRes(res);
    }

    if (method === 'GET' && path === '/admin/comics') {
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
      const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50')));
      const offset = (page - 1) * pageSize;
      const q = `select=*&order=created_at.desc&limit=${pageSize}&offset=${offset}`;
      const res = await sbGet('stories', q, env, token);
      return handleRes(res);
    }

    if (method === 'GET' && path.match(/^\/admin\/comics\/[^\/]+$/)) {
      const id = path.split('/')[3];
      const res = await sbGet('stories', `id=eq.${id}&select=*`, env, token);
      return handleRes(res);
    }

    if (method === 'PATCH' && path.match(/^\/admin\/comics\/[^\/]+$/)) {
      const id = path.split('/')[3];
      const body = (await request.json()) as Record<string, unknown>;
      const errors = validateBody(body, [
        { field: 'title', type: 'optional-string', maxLength: 200 },
        { field: 'author', type: 'optional-string', maxLength: 100 },
        { field: 'description', type: 'optional-string', maxLength: 2000 },
        { field: 'status', type: 'enum', enumValues: VALID_STATUSES },
        { field: 'coverUrl', type: 'optional-string', maxLength: 1000 },
      ]);
      if (errors.length > 0) {
        return err('VALIDATION_ERROR', errors.map(e => `${e.field}: ${e.message}`).join('; '), 400);
      }

      const s = sanitizeBody(body, [
        { field: 'title', type: 'optional-string', maxLength: 200 },
        { field: 'author', type: 'optional-string', maxLength: 100 },
        { field: 'description', type: 'optional-string', maxLength: 2000 },
        { field: 'status', type: 'enum', enumValues: VALID_STATUSES },
        { field: 'coverUrl', type: 'optional-string', maxLength: 1000 },
      ]);

      const payload: Record<string, unknown> = {};
      if (s.title !== undefined) payload.title = s.title as string;
      if (s.author !== undefined) payload.author = (s.author as string) || 'Unknown';
      if (s.description !== undefined) payload.description = (s.description as string) || null;
      if (s.status !== undefined) payload.status = s.status as string;
      if (s.coverUrl !== undefined) payload.cover_url = s.coverUrl as string;
      const res = await sbPatch('stories', `id=eq.${id}`, payload, env, token);
      return handleRes(res);
    }

    if (method === 'DELETE' && path.match(/^\/admin\/comics\/[^\/]+$/)) {
      const id = path.split('/')[3];
      const res = await sbDelete('stories', `id=eq.${id}`, env, token);
      return res.ok ? json({ success: true }) : handleRes(res);
    }

    if (method === 'POST' && path.match(/^\/admin\/comics\/[^\/]+\/chapters$/)) {
      const role = getAuthRole(request);
      if (!requireRole(role, ['superadmin', 'admin', 'employee'])) {
        return err('FORBIDDEN', 'Staff role required', 403);
      }

      const comicId = path.split('/')[3];
      const body = (await request.json()) as Record<string, unknown>;
      const errors = validateBody(body, [
        { field: 'comicId', type: 'optional-string', maxLength: 100 },
        { field: 'chapterNumber', type: 'optional-string' },
        { field: 'title', type: 'optional-string', maxLength: 500 },
        { field: 'pageUrls', type: 'optional-array' },
      ]);
      if (errors.length > 0) {
        return err('VALIDATION_ERROR', errors.map(e => `${e.field}: ${e.message}`).join('; '), 400);
      }

      const s = sanitizeBody(body, [
        { field: 'comicId', type: 'optional-string', maxLength: 100 },
        { field: 'chapterNumber', type: 'optional-string' },
        { field: 'title', type: 'optional-string', maxLength: 500 },
        { field: 'pageUrls', type: 'optional-array' },
      ]);

      const cn = parseInt((s.chapterNumber as string) || '1', 10);
      const payload = {
        story_id: (s.comicId as string) || comicId,
        chapter_number: Number.isFinite(cn) && cn > 0 ? cn : 1,
        title: (s.title as string) || `Chapter ${cn}`,
        content: JSON.stringify(s.pageUrls || []),
      };
      const res = await sbPost('chapters', payload, env, token);
      return handleRes(res);
    }

    return null;
  } catch (e: any) {
    return err(
      'INTERNAL_ERROR',
      e.message || 'Unknown error',
      500,
    );
  }
}
