import { RequestOptions } from '../types';

export type StorageFolder = 'chapters' | 'covers' | 'avatars' | string;

export interface StorageValidationOptions {
  /** Maximum allowed file size in bytes (defaults to 50MB) */
  maxSizeBytes?: number;
  /** Allowed MIME types (e.g. ['image/jpeg', 'image/png', 'image/webp', 'application/zip', 'application/x-cbz']) */
  allowedMimeTypes?: string[];
  /** Allowed file extensions without leading dot (e.g. ['jpg', 'png', 'webp', 'cbz', 'zip']) */
  allowedExtensions?: string[];
}

export interface StorageUploadOptions extends RequestOptions, StorageValidationOptions {
  /** Target storage folder category (e.g. 'chapters', 'covers', 'avatars') */
  folder?: StorageFolder;
  /** Explicit filename to store */
  filename?: string;
  /** Custom destination key (overrides automatic key generation) */
  key?: string;
  /** Associated comic identifier */
  comicId?: string;
  /** Associated chapter sequence number */
  chapterNumber?: number;
  /** Associated page index */
  pageNumber?: number;
  /** Explicit content type */
  contentType?: string;
  /** Direct upload via presigned URL if true */
  directUpload?: boolean;
}

export interface StorageUploadResult {
  /** The final storage key */
  key: string;
  /** Relative or internal URL returned by Gateway */
  url: string;
  /** Full public CDN or Gateway media URL */
  publicUrl: string;
  /** Admin direct file URL */
  fileUrl: string;
  /** Detected or provided file size */
  size?: number;
  /** MIME content type */
  contentType?: string;
  /** Operation success status */
  success: boolean;
}

export interface BatchUploadItem {
  file: Blob | File | ArrayBuffer | Uint8Array;
  options?: StorageUploadOptions;
}

export interface BatchUploadProgress {
  completed: number;
  total: number;
  currentKey?: string;
  percentage: number;
}

export interface BatchUploadResult {
  successful: Array<{ index: number; key: string; result: StorageUploadResult }>;
  failed: Array<{ index: number; error: string }>;
  total: number;
}

export interface StorageListOptions extends RequestOptions {
  /** Target folder (filters key prefix) */
  folder?: StorageFolder;
  /** Direct prefix filter */
  prefix?: string;
  /** Maximum number of items */
  limit?: number;
  /** Pagination continuation cursor */
  cursor?: string;
}

export interface StorageSignedUrlOptions extends RequestOptions {
  /** Expiration in seconds (default: 3600) */
  expiresInSeconds?: number;
  /** Expected action */
  action?: 'read' | 'write';
}

export interface StorageKeyInfo {
  folder: string;
  filename: string;
  extension: string;
  isArchive: boolean;
}
