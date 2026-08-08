import { NextRequest, NextResponse } from 'next/server';
import { requireRouteAuthorization } from '@/lib/security/route-auth';
import { ACTION_ADMIN_ROLES } from '@/lib/security/permission';
import { getBucketForFolder, putObject } from '@/lib/r2/s3';

const ALLOWED_ROLES = ACTION_ADMIN_ROLES;
// ponytail: 50MB in-memory ceiling (was 250MB) — covers .cbz/.zip; upgrade to streaming multipart put when archives exceed it
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'application/x-cbz',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
]);
const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'cbz', 'zip',
]);
const ALLOWED_FOLDERS = new Set(['chapters', 'covers', 'avatars']);

/**
 * POST /api/r2/upload
 * Accepts multipart/form-data uploads for comic images, covers, or .cbz/.zip archives.
 * Enforces RBAC (admin/superadmin/employee only), validates file type, size, and folder.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRouteAuthorization(request, { allowedRoles: ALLOWED_ROLES });
  if (!auth.ok) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data', success: false }, { status: 400 });
  }

  const file = formData.get('file');
  const folder = String(formData.get('folder') ?? 'chapters');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file', success: false }, { status: 400 });
  }
  if (!ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: 'Invalid folder', success: false }, { status: 400 });
  }

  // Extract and validate extension
  const nameParts = file.name.split('.');
  const extension = nameParts.length > 1 ? nameParts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const isCbzOrZip = extension === 'cbz' || extension === 'zip';

  if (!isCbzOrZip && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type', success: false }, { status: 415 });
  }
  if (extension && !ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json({ error: 'Unsupported file extension', success: false }, { status: 415 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `File too large (max ${MAX_FILE_SIZE / (1024 * 1024)}MB)`, success: false }, { status: 413 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Empty file', success: false }, { status: 400 });
  }

  const bucket = getBucketForFolder(folder);
  if (!bucket) {
    console.error('[R2 Upload] Storage not configured for folder:', folder);
    return NextResponse.json({ error: 'Storage not configured', success: false }, { status: 500 });
  }

  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}${extension ? `.${extension}` : ''}`;

  try {
    const body = new Uint8Array(await file.arrayBuffer());
    await putObject(bucket, key, body, file.type || 'application/octet-stream');
    return NextResponse.json({ success: true, key, url: key });
  } catch (error) {
    console.error('[R2 Upload] Failed:', error);
    return NextResponse.json({ error: 'Upload failed', success: false }, { status: 500 });
  }
}