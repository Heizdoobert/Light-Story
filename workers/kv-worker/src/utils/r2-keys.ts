/** Pure R2 upload key/validation helpers — no env access, unit-testable. */

export const ALLOWED_UPLOAD_FOLDERS = ['chapters', 'covers', 'avatars', 'uploads'] as const;

// 10MB/file keeps multipart parsing + arrayBuffer well under the 10ms CPU budget
// (a 15MB guard accepted bodies that could exceed it). Batch cap keeps the total
// request body safely under the 100MB limit and avoids Cloudflare's HTML 413.
export const MAX_PAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_BATCH_UPLOAD_BYTES = 90 * 1024 * 1024;

const IMAGE_TYPE_RE = /^image\/(jpeg|png|webp|avif|gif|tiff)$/;
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|avif|gif|tiff)$/i;

export function isAllowedUploadFolder(folder: string): boolean {
  return (ALLOWED_UPLOAD_FOLDERS as readonly string[]).includes(folder);
}

/**
 * Mirrors what the frontend can actually produce: convertToWebP has fallback
 * paths that return the ORIGINAL file (tiff/heic/bmp) or a browser may send an
 * empty file.type — in those cases fall back to a filename extension check.
 */
export function isImageFileType(type: string, name = ''): boolean {
  if (!type) return IMAGE_EXT_RE.test(name);
  return IMAGE_TYPE_RE.test(type);
}

export function pageNumberFromForm(value: string | null | undefined): number | null {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null; // strict: '2.5', '7abc', '1e3' rejected
  const n = parseInt(value, 10);
  return n >= 1 ? n : null;
}

export interface UploadFileLike {
  size: number;
  type: string;
  name: string;
}

export interface UploadValidationError {
  status: 400 | 413;
  code: 'BAD_REQUEST' | 'TOO_LARGE';
  message: string;
}

/**
 * Validate-then-write guard: rejects the whole batch before any put so a bad
 * file can't leave earlier files orphaned in R2. Order matches legacy behavior:
 * batch cap first, then per-file size, then content type.
 */
export function validateUploadBatch(files: UploadFileLike[]): UploadValidationError | null {
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  if (totalBytes > MAX_BATCH_UPLOAD_BYTES) {
    return {
      status: 413,
      code: 'TOO_LARGE',
      message: `Batch exceeds ${MAX_BATCH_UPLOAD_BYTES / 1024 / 1024}MB`,
    };
  }
  for (const file of files) {
    if (file.size === 0) {
      return { status: 400, code: 'BAD_REQUEST', message: `Empty file: ${file.name}` };
    }
    if (file.size > MAX_PAGE_UPLOAD_BYTES) {
      return {
        status: 413,
        code: 'TOO_LARGE',
        message: `File exceeds ${MAX_PAGE_UPLOAD_BYTES / 1024 / 1024}MB: ${file.name}`,
      };
    }
    if (!isImageFileType(file.type, file.name)) {
      return { status: 400, code: 'BAD_REQUEST', message: `Not an image: ${file.name}` };
    }
  }
  return null;
}

export interface UploadKeyOptions {
  folder: string;
  ext: string;
  comicId?: string | null;
  chapterNumber?: string | null;
  pageNumber?: string | null;
  loopIndex: number;
  userId?: string | null;
}

/** Mirrors the legacy key scheme; pageNumber (1-based) overrides loop index when present. */
export function buildUploadKey(opts: UploadKeyOptions): string {
  const { folder, ext } = opts;
  if (folder === 'covers') {
    // full UUID for fallback: covers without comicId collide at ~1% with 32-bit slices
    return opts.comicId ? `covers/${opts.comicId}.${ext}` : `covers/${crypto.randomUUID()}.${ext}`;
  }
  if (folder === 'chapters') {
    const cId = opts.comicId || 'general';
    const cNum = opts.chapterNumber || '1';
    const pageNum = pageNumberFromForm(opts.pageNumber) ?? opts.loopIndex + 1;
    // ponytail: 32-bit uuid8 suffix is collision-safe within one chapter prefix;
    // full UUID if a single chapter ever exceeds ~100k pages
    return `chapters/${cId}/chapter-${cNum}/page-${pageNum}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  }
  if (folder === 'avatars') {
    return opts.userId ? `avatars/${opts.userId}.${ext}` : `avatars/${crypto.randomUUID()}.${ext}`;
  }
  return `uploads/${crypto.randomUUID().slice(0, 8)}.${ext}`;
}
