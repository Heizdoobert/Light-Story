import { NextRequest, NextResponse } from 'next/server';
import { requireRouteAuthorization } from '@/lib/auth/route-auth';
import { getBucketForFolder, putObject } from '@/lib/r2/s3';

const ALLOWED_ROLES = ['admin', 'superadmin', 'employee'] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const ALLOWED_FOLDERS = new Set(['chapters', 'covers']);

export async function POST(request: NextRequest) {
  const auth = await requireRouteAuthorization(request, { allowedRoles: ALLOWED_ROLES });
  if (!auth.ok) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'invalid form data', success: false }, { status: 400 });
  }

  const file = formData.get('file');
  const folder = String(formData.get('folder') ?? 'chapters');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing file', success: false }, { status: 400 });
  }
  if (!ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: 'invalid folder', success: false }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'unsupported file type', success: false }, { status: 415 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'file too large', success: false }, { status: 413 });
  }

  const bucket = getBucketForFolder(folder);
  if (!bucket) {
    return NextResponse.json({ error: 'storage not configured', success: false }, { status: 500 });
  }

  const extension = (file.name.split('.').pop() ?? '').toLowerCase();
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}${extension ? `.${extension}` : ''}`;

  try {
    const body = new Uint8Array(await file.arrayBuffer());
    await putObject(bucket, key, body, file.type);
    return NextResponse.json({ success: true, key, url: key });
  } catch (error) {
    console.error('R2 upload failed', error);
    return NextResponse.json({ error: 'upload failed', success: false }, { status: 500 });
  }
}