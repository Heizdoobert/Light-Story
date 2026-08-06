import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

export const R2_BUCKET_COVERS =
  process.env.R2_BUCKET_COVERS ||
  process.env.NEXT_PUBLIC_R2_BUCKET_COVERS ||
  "";
export const R2_BUCKET_CHAPTERS =
  process.env.R2_BUCKET_CHAPTERS ||
  process.env.NEXT_PUBLIC_R2_BUCKET_CHAPTERS ||
  "";

export function getBucketForFolder(folder: string): string {
  const normalized = folder.toLowerCase();
  if (normalized.includes("cover")) return R2_BUCKET_COVERS;
  return R2_BUCKET_CHAPTERS;
}

export function contentKey(bucket: string, key: string): string {
  const { host } = new URL(
    bucket.includes("://") ? bucket : `https://${bucket}.r2.dev`,
  );
  return `${host}/${key.replace(/^\/+/, "")}`;
}

export function getS3Client(token: {
  accessKeyId: string;
  secretAccessKey: string;
}): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint =
    process.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!endpoint) {
    throw new Error("R2_ENDPOINT or R2_ACCOUNT_ID is not configured");
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: token.accessKeyId,
      secretAccessKey: token.secretAccessKey,
    },
  });
}

export async function putObject(
  bucket: string,
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY environment variables.");
  }
  const client = getS3Client({
    accessKeyId,
    secretAccessKey,
  });
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObject(
  bucket: string,
  key: string,
): Promise<{ body: Uint8Array | undefined; contentType?: string }> {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY environment variables.");
  }
  const client = getS3Client({
    accessKeyId,
    secretAccessKey,
  });
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await client.send(command);
  const body = response.Body
    ? Buffer.from(await response.Body.transformToByteArray())
    : undefined;
  return { body, contentType: response.ContentType };
}

export function isStorageConfigured(): boolean {
  return Boolean(
    R2_BUCKET_COVERS &&
    R2_BUCKET_CHAPTERS &&
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY,
  );
}
