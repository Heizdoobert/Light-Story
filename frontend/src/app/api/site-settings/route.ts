import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSessionClient } from '@/lib/server';
import { getServerSupabase } from '@/lib/supabase/server';
import {
  isAdSlotKey,
  isAllowedAdSettingKey,
  isValidAdScope,
  parseSiteSettingsRows,
  sanitizeAdSettingValue,
  toSafeAdRows,
  toSettingPairs,
  validateAdMarkup,
} from '@/lib/adPolicy';
import { getAdSettings, upsertAdSetting } from '@/services/siteSettings.service';

type Requester = {
  ok: boolean;
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

    return { ok: true, role: String(data.role ?? 'user') };
  } catch {
    return { ok: false };
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const scopeRaw = url.searchParams.get('scope');
    const scope = isValidAdScope(scopeRaw) ? scopeRaw : 'public';

    const rows = await getAdSettings();
    const safeRows = toSafeAdRows(rows);

    if (scope === 'public') {
      return NextResponse.json({ data: safeRows });
    }

    const requester = await getRequester(request);
    if (!requester.ok || (requester.role !== 'superadmin' && requester.role !== 'admin' && requester.role !== 'internal')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ data: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requester = await getRequester(request);
  if (!requester.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (requester.role !== 'superadmin' && requester.role !== 'admin' && requester.role !== 'internal') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const pairs = toSettingPairs(body.payload ?? body);
    if (pairs.length === 0) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
    }

    const currentRows = await getAdSettings();
    const nextRows = [...currentRows];

    for (const pair of pairs) {
      if (!isAllowedAdSettingKey(pair.key)) {
        return NextResponse.json({ error: `unsupported key: ${pair.key}` }, { status: 400 });
      }

      const normalizedValue = sanitizeAdSettingValue(pair.key, pair.value);
      const existingIndex = nextRows.findIndex((item) => item.key === pair.key);
      if (existingIndex >= 0) {
        nextRows[existingIndex] = { key: pair.key, value: normalizedValue };
      } else {
        nextRows.push({ key: pair.key, value: normalizedValue });
      }
    }

    const { runtime, slotMarkup } = parseSiteSettingsRows(nextRows);

    for (const pair of pairs) {
      if (!isAdSlotKey(pair.key)) continue;
      const validation = validateAdMarkup(slotMarkup[pair.key], runtime);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.reason }, { status: 400 });
      }
    }

    for (const pair of pairs) {
      const normalizedValue = sanitizeAdSettingValue(pair.key, pair.value);
      await upsertAdSetting(pair.key, normalizedValue);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'internal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
