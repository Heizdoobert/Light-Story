import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MASK_BYTES,
  DEFAULT_XOR_KEY,
  createUnmaskTransformStream,
  xorBufferHeader,
} from '../utils/cbz-obfuscation';

describe('20MB Chapter Round-Trip & Stress Benchmark', () => {
  it('guarantees 100% bit-for-bit round-trip accuracy on a 20MB simulated CBZ chapter archive', async () => {
    const FILE_SIZE = 20 * 1024 * 1024; // 20MB
    const original = new Uint8Array(FILE_SIZE);

    // Standard ZIP Local Header PK\x03\x04
    original[0] = 0x50;
    original[1] = 0x4b;
    original[2] = 0x03;
    original[3] = 0x04;

    for (let i = 4; i < FILE_SIZE; i += 4) {
      const val = (i * 1664525 + 1013904223) >>> 0;
      original[i] = val & 0xff;
      if (i + 1 < FILE_SIZE) original[i + 1] = (val >>> 8) & 0xff;
      if (i + 2 < FILE_SIZE) original[i + 2] = (val >>> 16) & 0xff;
      if (i + 3 < FILE_SIZE) original[i + 3] = (val >>> 24) & 0xff;
    }

    const originalSha = crypto.createHash('sha256').update(original).digest('hex');

    // 1. Mask header (simulating ingestion before upload to Google Drive)
    const masked = xorBufferHeader(original);
    const maskedSha = crypto.createHash('sha256').update(masked).digest('hex');

    // Confirm obfuscation
    expect(masked[0]).not.toBe(0x50);
    expect(masked[1]).not.toBe(0x4b);
    expect(maskedSha).not.toBe(originalSha);

    // 2. Stream unmask via TransformStream (simulating on-demand fallback stream)
    const CHUNK_SIZE = 64 * 1024; // 64KB chunks
    const transformStream = createUnmaskTransformStream();
    const reader = transformStream.readable.getReader();
    const writer = transformStream.writable.getWriter();

    (async () => {
      for (let offset = 0; offset < FILE_SIZE; offset += CHUNK_SIZE) {
        const slice = masked.subarray(offset, Math.min(offset + CHUNK_SIZE, FILE_SIZE));
        await writer.write(slice);
      }
      await writer.close();
    })();

    const receivedChunks: Uint8Array[] = [];
    let bytesRead = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        receivedChunks.push(value);
        bytesRead += value.length;
      }
    }

    expect(bytesRead).toBe(FILE_SIZE);

    const restored = new Uint8Array(FILE_SIZE);
    let offset = 0;
    for (const chunk of receivedChunks) {
      restored.set(chunk, offset);
      offset += chunk.length;
    }

    const restoredSha = crypto.createHash('sha256').update(restored).digest('hex');

    // Confirm 100% bit-for-bit integrity
    expect(restoredSha).toBe(originalSha);
    expect(Buffer.compare(Buffer.from(restored), Buffer.from(original))).toBe(0);
  }, 30000); // 30s timeout for 20MB stream
});
