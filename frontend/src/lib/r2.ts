import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ponytail: minimum clean setup for Cloudflare R2 connection using AWS S3 SDK
export const r2Client = new S3Client({
  region: "auto", // Required "auto" for Cloudflare R2
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});

/**
 * Upload a file buffer/stream directly to an R2 bucket
 */
export async function uploadToR2({
  bucket,
  key,
  body,
  contentType,
}: {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array | Blob | string;
  contentType?: string;
}) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  return r2Client.send(command);
}

/**
 * Delete an object from an R2 bucket
 */
export async function deleteFromR2({
  bucket,
  key,
}: {
  bucket: string;
  key: string;
}) {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return r2Client.send(command);
}

/**
 * Generate a presigned URL for direct client-side upload or private read
 */
export async function getPresignedR2Url({
  bucket,
  key,
  operation = "put",
  expiresIn = 3600,
}: {
  bucket: string;
  key: string;
  operation?: "put" | "get";
  expiresIn?: number;
}) {
  const command =
    operation === "put"
      ? new PutObjectCommand({ Bucket: bucket, Key: key })
      : new GetObjectCommand({ Bucket: bucket, Key: key });

  return getSignedUrl(r2Client, command, { expiresIn });
}
