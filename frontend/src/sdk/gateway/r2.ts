import { GatewayHttpClient } from './client';
import {
  R2UploadOptions,
  R2UploadResponse,
  R2SignedUrlResponse,
  R2ListResponse,
  RequestOptions,
} from './types';

export class R2Client {
  constructor(private http: GatewayHttpClient) {}

  /**
   * Upload a file/blob to Cloudflare R2 via Worker Gateway.
   */
  public async upload(
    file: Blob | File,
    options: R2UploadOptions = {},
  ): Promise<R2UploadResponse> {
    const {
      filename,
      folder,
      comicId,
      chapterNumber,
      pageNumber,
      key,
      ...reqOptions
    } = options;

    const formData = new FormData();
    if (filename) {
      formData.append('file', file, filename);
      formData.append('filename', filename);
    } else {
      formData.append('file', file);
    }

    if (key) formData.append('key', key);
    if (folder) formData.append('folder', folder);
    if (comicId) formData.append('comicId', comicId);
    if (chapterNumber !== undefined) formData.append('chapterNumber', String(chapterNumber));
    if (pageNumber !== undefined) formData.append('pageNumber', String(pageNumber));

    return this.http.post<R2UploadResponse>('/api/admin/r2/upload', formData, reqOptions);
  }

  /**
   * Request a signed URL for an R2 object.
   */
  public async getSignedUrl(
    key: string,
    expires: number = 3600,
    options?: RequestOptions,
  ): Promise<R2SignedUrlResponse> {
    return this.http.post<R2SignedUrlResponse>(
      '/api/admin/r2/signed-url',
      { key, expires },
      options,
    );
  }

  /**
   * List objects stored in R2 bucket.
   */
  public async list(
    params?: { prefix?: string; limit?: number; cursor?: string },
    options?: RequestOptions,
  ): Promise<R2ListResponse> {
    return this.http.get<R2ListResponse>('/api/admin/r2/list', {
      ...options,
      params: {
        ...(params as Record<string, string | number | undefined>),
        ...(options?.params || {}),
      },
    });
  }

  /**
   * Batch cleanup/delete R2 objects by keys.
   */
  public async cleanup(
    keys: string[],
    options?: RequestOptions,
  ): Promise<{ success: boolean; deletedCount?: number }> {
    return this.http.post<{ success: boolean; deletedCount?: number }>(
      '/api/admin/r2/cleanup',
      { keys },
      options,
    );
  }

  /**
   * Public media URL helper (encoded URI key).
   */
  public getMediaUrl(key: string): string {
    return `${this.http.getBaseUrl()}/api/media/${encodeURIComponent(key)}`;
  }

  /**
   * Alias for getMediaUrl.
   */
  public getPublicMediaUrl(key: string): string {
    return `${this.http.getBaseUrl()}/api/media/${key.replace(/^\/+/, '')}`;
  }

  /**
   * Admin direct file URL helper (encoded URI key).
   */
  public getFileUrl(key: string): string {
    return `${this.http.getBaseUrl()}/api/admin/r2/file/${encodeURIComponent(key)}`;
  }
}
