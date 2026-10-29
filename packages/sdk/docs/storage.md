# Storage & Media Management

`StorageManager` manages file uploads to Cloudflare R2 via Worker Gateway, presigned URLs, and local storage abstractions.

## StorageManager (`client.storage`)

### Single File Upload

```typescript
const result = await client.storage.upload(fileBlob, {
  folder: 'covers',
  filename: 'my-cover.webp',
  allowedExtensions: ['jpg', 'png', 'webp'],
  maxSizeBytes: 10 * 1024 * 1024,
});

console.log(result.publicUrl);
console.log(result.key);
```

### Batch Upload with Concurrency

```typescript
const batchResult = await client.storage.uploadBatch(chapterPages, {
  folder: 'chapters/chapter-1',
  concurrency: 4,
  onProgress: (p) => {
    console.log(`Uploaded ${p.completed}/${p.total} (${p.percentage}%)`);
  },
});

console.log(batchResult.successful);
console.log(batchResult.failed);
```

### Presigned URLs & Listing

```typescript
// Generate signed download URL
const { signedUrl } = await client.storage.getSignedUrl('covers/comic-1.webp');

// List files with pagination
const list = await client.storage.listFiles({ folder: 'covers', limit: 20 });
```

## Storage Adapters

Isomorphic key-value storage adapters with synchronous and asynchronous methods:
- `WebStorageAdapter`: Wraps `window.localStorage` or `window.sessionStorage`.
- `MemoryStorageAdapter`: Fast in-memory store for SSR and unit testing.
- `createStorageAdapter`: Factory function that automatically chooses WebStorage in browsers and degrades safely to MemoryStorageAdapter in Node/SSR.
