import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.R2_ACCOUNT_ID = 'acct';
  process.env.R2_ACCESS_KEY_ID = 'ak';
  process.env.R2_SECRET_ACCESS_KEY = 'sk';
  process.env.R2_BUCKET_COVERS = 'covers-bucket';
  process.env.R2_BUCKET_CHAPTERS = 'chapters-bucket';
});

const S3ClientMock = vi.hoisted(() => vi.fn());

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: S3ClientMock,
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

describe('r2 s3 client', () => {
  beforeEach(() => {
    vi.resetModules();
    S3ClientMock.mockClear();
    S3ClientMock.mockImplementation(function () {
      return { send: vi.fn(async () => ({})) };
    });
  });

  it('reuses a single S3Client instance across calls', async () => {
    const { getS3Client } = await import('./s3');
    const a = getS3Client({ accessKeyId: 'ak', secretAccessKey: 'sk' });
    const b = getS3Client({ accessKeyId: 'ak', secretAccessKey: 'sk' });
    expect(a).toBe(b);
    expect(S3ClientMock).toHaveBeenCalledTimes(1);
  });

  it('putObject reuses the cached client across requests', async () => {
    const { putObject } = await import('./s3');
    await putObject('chapters-bucket', 'chapters/x.jpg', new Uint8Array(1), 'image/jpeg');
    await putObject('chapters-bucket', 'chapters/y.jpg', new Uint8Array(1), 'image/jpeg');
    expect(S3ClientMock).toHaveBeenCalledTimes(1);
  });

  it('maps folders to buckets (avatars goes to covers)', async () => {
    const { getBucketForFolder } = await import('./s3');
    expect(getBucketForFolder('chapters')).toBe('chapters-bucket');
    expect(getBucketForFolder('covers')).toBe('covers-bucket');
    expect(getBucketForFolder('avatars')).toBe('covers-bucket');
  });
});
