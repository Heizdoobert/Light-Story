import { HttpClient } from '../client';
import { R2Client } from '../gateway/r2';
import { RequestOptions, R2SignedUrlResponse, R2ListResponse } from '../types';
import {
  StorageUploadOptions,
  StorageUploadResult,
  BatchUploadItem,
  BatchUploadProgress,
  BatchUploadResult,
  StorageListOptions,
  StorageSignedUrlOptions,
  StorageValidationOptions,
  StorageKeyInfo,
} from './types';

export const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB ceiling

export const DEFAULT_ALLOWED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'avif',
  'gif',
  'cbz',
  'zip',
];

export const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'application/x-cbz',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
];

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Extracts normalized file extension from a filename.
 * Protects against multi-dot bypasses.
 */
export function extractFileExtension(filename: string): string {
  const dotIdx = filename.lastIndexOf('.');
  return dotIdx > 0 ? filename.slice(dotIdx + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
}

/**
 * Sanitizes folder names to strictly prevent path traversal (e.g. ../ or absolute paths).
 */
export function sanitizeFolder(folder?: string, defaultFolder = 'chapters'): string {
  if (!folder) return defaultFolder;
  const clean = folder
    .replace(/\\/g, '/')
    .replace(/\.\.+/g, '')               // strip traversal sequences
    .replace(/[^a-zA-Z0-9_\-]/g, '')     // enforce alphanumeric folder names
    .trim();
  return clean || defaultFolder;
}

/**
 * Sanitizes storage keys to prevent directory traversal and illegal characters.
 * Enforces stripping of multi-dot traversal attempts and dangerous characters.
 */
export function sanitizeStorageKey(key: string): string {
  return key
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.replace(/\.\.+/g, ''))
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .map((segment) => segment.replace(/[^a-zA-Z0-9_\-\.]/g, '_'))
    .join('/');
}

export class StorageManager {
  private r2: R2Client;

  constructor(public readonly http: HttpClient) {
    this.r2 = new R2Client(http);
  }

  /**
   * Validate file size, extension, and MIME type against security policies.
   */
  public validate(
    file: { size?: number; name?: string; type?: string },
    options: StorageValidationOptions = {},
  ): { valid: boolean; error?: string } {
    const maxSize = options.maxSizeBytes ?? DEFAULT_MAX_FILE_SIZE;
    const allowedExts = options.allowedExtensions ?? DEFAULT_ALLOWED_EXTENSIONS;
    const allowedMimes = options.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES;

    if (file.size !== undefined) {
      if (typeof file.size !== 'number' || !Number.isFinite(file.size) || file.size <= 0) {
        return { valid: false, error: 'File is empty (0 bytes).' };
      }
      if (file.size > maxSize) {
        const mb = Math.round(maxSize / (1024 * 1024));
        return { valid: false, error: `File size exceeds the maximum allowed limit of ${mb}MB.` };
      }
    }

    if (file.name) {
      if (/[\x00-\x1f\x7f]/.test(file.name)) {
        return { valid: false, error: 'Filename contains forbidden control characters.' };
      }
      const ext = extractFileExtension(file.name);
      if (allowedExts.length > 0) {
        if (!ext || !allowedExts.includes(ext)) {
          return {
            valid: false,
            error: ext
              ? `File extension .${ext} is not allowed.`
              : 'File must have an allowed extension.',
          };
        }
      }
    }

    if (file.type && allowedMimes.length > 0) {
      const normalizedType = file.type.toLowerCase();
      if (!allowedMimes.includes(normalizedType)) {
        return { valid: false, error: `MIME type "${file.type}" is not supported.` };
      }
    }

    return { valid: true };
  }

  /**
   * Parse a storage key into folder, filename, and extension details.
   */
  public parseKey(key: string): StorageKeyInfo {
    const sanitized = sanitizeStorageKey(key);
    const slashIdx = sanitized.indexOf('/');
    const folder = slashIdx > -1 ? sanitized.slice(0, slashIdx) : '';
    const filename = slashIdx > -1 ? sanitized.slice(slashIdx + 1) : sanitized;
    const extension = extractFileExtension(filename);
    const isArchive = extension === 'cbz' || extension === 'zip';

    return { folder, filename, extension, isArchive };
  }

  /**
   * Generate a standardized, unique storage object key.
   */
  public generateKey(folder: string = 'chapters', originalFilename?: string): string {
    const cleanFolder = sanitizeFolder(folder);
    const extension = originalFilename ? extractFileExtension(originalFilename) : '';
    const suffix = extension ? `.${extension}` : '';
    return `${cleanFolder}/${Date.now()}-${generateUUID()}${suffix}`;
  }

  /**
   * Upload a file or binary payload to Cloudflare R2 via Gateway.
   */
  public async upload(
    fileInput: Blob | File | ArrayBuffer | Uint8Array,
    options: StorageUploadOptions = {},
  ): Promise<StorageUploadResult> {
    const isBinary = fileInput instanceof ArrayBuffer || fileInput instanceof Uint8Array;
    const blob = isBinary
      ? new Blob([fileInput as BlobPart], { type: options.contentType || 'application/octet-stream' })
      : fileInput;

    const filename =
      options.filename ??
      ('name' in fileInput && typeof (fileInput as File).name === 'string'
        ? (fileInput as File).name
        : undefined);

    const contentType = options.contentType ?? (blob.type || undefined);
    const size = blob.size;

    // Run security validation
    const validation = this.validate({ size, name: filename, type: contentType }, options);
    if (!validation.valid) {
      throw new Error(`[StorageManager] Validation error: ${validation.error}`);
    }

    const folder = sanitizeFolder(options.folder);
    const rawKey = options.key || this.generateKey(folder, filename);
    const key = sanitizeStorageKey(rawKey);

    const uploadRes = await this.r2.upload(blob, {
      ...options,
      filename,
      folder,
      key,
    });

    const finalKey = sanitizeStorageKey(uploadRes.key || key);

    return {
      key: finalKey,
      url: uploadRes.url || finalKey,
      publicUrl: this.getPublicUrl(finalKey),
      fileUrl: this.getFileUrl(finalKey),
      size: uploadRes.size ?? size,
      contentType: uploadRes.contentType ?? contentType,
      success: true,
    };
  }

  /**
   * Upload multiple files in parallel with controlled concurrency.
   */
  public async uploadBatch(
    items: BatchUploadItem[],
    options: {
      concurrency?: number;
      onProgress?: (progress: BatchUploadProgress) => void;
    } = {},
  ): Promise<BatchUploadResult> {
    const concurrency = Math.max(1, options.concurrency ?? 3);
    const total = items.length;
    const successful: BatchUploadResult['successful'] = [];
    const failed: BatchUploadResult['failed'] = [];
    let completed = 0;
    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < items.length) {
        const index = currentIndex++;
        const item = items[index];

        try {
          const result = await this.upload(item.file, item.options);
          successful.push({ index, key: result.key, result });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          failed.push({ index, error: message });
        } finally {
          completed++;
          if (options.onProgress) {
            options.onProgress({
              completed,
              total,
              percentage: total > 0 ? Math.round((completed / total) * 100) : 100,
            });
          }
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, total) },
      () => worker(),
    );

    await Promise.all(workers);

    return {
      successful: successful.sort((a, b) => a.index - b.index),
      failed: failed.sort((a, b) => a.index - b.index),
      total,
    };
  }

  /**
   * Retrieve a signed URL for secure R2 access or upload.
   * Enforces bounded expiration between 60 seconds and 24 hours.
   */
  public async getSignedUrl(
    key: string,
    options: StorageSignedUrlOptions = {},
  ): Promise<R2SignedUrlResponse> {
    const safeKey = sanitizeStorageKey(key);
    if (!safeKey) {
      throw new Error('[StorageManager] Key cannot be empty after sanitization.');
    }
    const requestedExpires = options.expiresInSeconds ?? 3600;
    const expires = Math.min(Math.max(60, requestedExpires), 86400); // 1 min to 24 hours
    return this.r2.getSignedUrl(safeKey, expires, options);
  }

  /**
   * List files stored in the R2 bucket with optional folder and prefix filtering.
   */
  public async listFiles(options: StorageListOptions = {}): Promise<R2ListResponse> {
    const { folder, prefix, limit, cursor, ...reqOptions } = options;
    let fullPrefix = prefix ? sanitizeStorageKey(prefix) : undefined;

    if (folder) {
      const cleanFolder = sanitizeFolder(folder);
      fullPrefix = fullPrefix ? `${cleanFolder}/${fullPrefix.replace(/^\/+/, '')}` : `${cleanFolder}/`;
    }

    return this.r2.list({ prefix: fullPrefix, limit, cursor }, reqOptions);
  }

  /**
   * Delete a single file by storage key with key sanitization.
   */
  public async delete(key: string, options?: RequestOptions): Promise<boolean> {
    const safeKey = sanitizeStorageKey(key);
    const res = await this.r2.cleanup([safeKey], options);
    return res.success;
  }

  /**
   * Delete a collection of files by storage keys.
   */
  public async deleteBatch(
    keys: string[],
    options?: RequestOptions,
  ): Promise<{ success: boolean; deletedCount?: number }> {
    const safeKeys = keys.map(sanitizeStorageKey).filter(Boolean);
    return this.r2.cleanup(safeKeys, options);
  }

  /**
   * Get public CDN or Gateway media URL for direct browser asset consumption.
   */
  public getPublicUrl(key: string): string {
    return this.r2.getMediaUrl(sanitizeStorageKey(key));
  }

  /**
   * Get direct admin authenticated file proxy URL.
   */
  public getFileUrl(key: string): string {
    return this.r2.getFileUrl(sanitizeStorageKey(key));
  }
}

/**
 * Factory helper to construct a standalone StorageManager.
 */
export function createStorageManager(http: HttpClient): StorageManager {
  return new StorageManager(http);
}
