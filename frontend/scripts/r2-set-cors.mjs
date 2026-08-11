#!/usr/bin/env node
// r2-set-cors.mjs — Apply CORS rules to the Cloudflare R2 buckets used for
// story covers and chapter images.
//
// Usage:
//   node scripts/r2-set-cors.mjs [bucket...]
//
// Buckets default to NEXT_PUBLIC_R2_BUCKET_COVERS + NEXT_PUBLIC_R2_BUCKET_CHAPTERS.
// The allowed origin is read from NEXT_PUBLIC_CUSTOM_GATEWAY_DOMAIN (the site
// origin, no protocol) or falls back to http://localhost:3001.

import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

const domain = (process.env.NEXT_PUBLIC_CUSTOM_GATEWAY_DOMAIN || 'localhost:3001')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');

const origins = [`https://${domain}`, 'http://localhost:3001'];

const defaultBuckets = [
  process.env.NEXT_PUBLIC_R2_BUCKET_COVERS,
  process.env.NEXT_PUBLIC_R2_BUCKET_CHAPTERS,
].filter(Boolean);

const buckets = process.argv.slice(2).length > 0 ? process.argv.slice(2) : defaultBuckets;

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('Missing R2 credentials: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  process.exit(1);
}

if (buckets.length === 0) {
  console.error('No buckets configured. Set NEXT_PUBLIC_R2_BUCKET_COVERS / NEXT_PUBLIC_R2_BUCKET_CHAPTERS.');
  process.exit(1);
}

const client = new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } });

const corsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: origins,
      AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600,
    },
  ],
};

for (const bucket of buckets) {
  const command = new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: corsConfiguration,
  });
  await client.send(command);
  console.log(`CORS configured for r2 bucket: ${bucket} (origins: ${origins.join(', ')})`);
}
