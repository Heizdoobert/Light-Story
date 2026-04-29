import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSessionClient } from '@/lib/server';
import { getServerSupabase } from '@/lib/supabase/server';

type Requester = {
  ok: boolean;
  id?: string;
  role?: string;
};

async function getRequester(request: NextRequest): Promise<Requester> {
  const internalSecret = request.headers.get('x-internal-secret');
  if (internalSecret && process.env.INTERNAL_ADMIN_SECRET && internalSecret === process.env.INTERNAL_ADMIN_SECRET) {
    return { ok: true, role: 'internal' };
  }

  try {
    const sessionClient = await createSessionClient();
    const { data: userData, error: userError } = await sessionClient.auth.getUser();
    const userId = userData.user?.id;
    if (userError || !userId) return { ok: false };

    const supabase = getServerSupabase();
    if (!supabase) return { ok: false };
    const { data } = await supabase.from('profiles').select('id,role').eq('id', userId).single();
    if (!data) return { ok: false };
    return { ok: true, id: userId, role: data.role };
  } catch {
    return { ok: false };
  }
}

export async function POST(request: NextRequest) {
  const requester = await getRequester(request);
  if (!requester.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (requester.role !== 'superadmin' && requester.role !== 'internal') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'server supabase unavailable' }, { status: 500 });

  const body = await request.json().catch(() => null);
  const action = body?.action;

  try {
    if (action === 'create') {
      const email = typeof body?.email === 'string' ? body.email.trim() : '';
      const password = typeof body?.password === 'string' ? body.password : '';
      const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
      const role = typeof body?.role === 'string' ? body.role : 'user';

      if (!email || password.length < 6) {
        return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
      }

      const created = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || undefined,
        },
      });

      if (created.error || !created.data.user?.id) {
        throw created.error ?? new Error('createUser failed');
      }

      const userId = created.data.user.id;
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email,
        full_name: fullName || null,
        role,
      });

      if (profileError) {
        await supabase.auth.admin.deleteUser(userId);
        throw profileError;
      }

      await supabase.from('admin_audit_logs').insert({
        actor_user_id: requester.id,
        action: 'user_create',
        target_user_id: userId,
        target_email: email,
        metadata: { assignedRole: role },
      });

      return NextResponse.json({ userId, email, role });
    }

    if (action === 'delete') {
      const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
      const targetEmail = typeof body?.targetEmail === 'string' ? body.targetEmail.trim() : null;
      if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });
      if (requester.id && userId === requester.id) {
        return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
      }

      const deleted = await supabase.auth.admin.deleteUser(userId, true);
      if (deleted.error) throw deleted.error;

      await supabase.from('admin_audit_logs').insert({
        actor_user_id: requester.id,
        action: 'user_delete',
        target_user_id: userId,
        target_email: targetEmail,
      });

      return NextResponse.json({ deleted: true, userId });
    }

    return NextResponse.json({ error: 'action must be one of: create, delete' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'internal' }, { status: 500 });
  }
}