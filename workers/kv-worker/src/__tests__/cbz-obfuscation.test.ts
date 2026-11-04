import { describe, expect, it } from 'vitest';
import {
  createUnmaskTransformStream,
  xorBufferHeader,
} from '../utils/cbz-obfuscation';

describe('CBZ Magic Byte XOR Obfuscation', () => {
  it('symmetrically masks and unmasks standard ZIP headers', () => {
    // Standard ZIP local file header starts with PK\x03\x04
    const originalZipHeader = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00,
      0x08, 0x00, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa,
      0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88,
      0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00,
      0x12, 0x34, 0x56, 0x78, // Byte 32..35 should remain untouched
    ]);

    const masked = xorBufferHeader(originalZipHeader);

    // Verify header is completely disguised (NOT PK\x03\x04)
    expect(masked[0]).not.toBe(0x50);
    expect(masked[1]).not.toBe(0x4b);
    expect(masked[2]).not.toBe(0x03);
    expect(masked[3]).not.toBe(0x04);

    // Verify bytes beyond mask length (byte 32+) are identical
    expect(masked.slice(32)).toEqual(originalZipHeader.slice(32));

    // Verify unmasking restores original bytes 100%
    const unmasked = xorBufferHeader(masked);
    expect(unmasked).toEqual(originalZipHeader);
  });

  it('unmasks streaming data correctly with a single large chunk via TransformStream', async () => {
    const rawData = new Uint8Array(100);
    for (let i = 0; i < 100; i++) rawData[i] = i;

    const maskedData = xorBufferHeader(rawData);

    // Feed through TransformStream
    const transformStream = createUnmaskTransformStream();
    const reader = transformStream.readable.getReader();
    const writer = transformStream.writable.getWriter();

    // Write asynchronously so reader can consume chunks without backpressure deadlock
    (async () => {
      await writer.write(maskedData);
      await writer.close();
    })();

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const c of chunks) {
      result.set(c, offset);
      offset += c.length;
    }

    expect(result).toEqual(rawData);
  });

  it('unmasks streaming data seamlessly across tiny chunk boundaries (e.g. 5 bytes each)', async () => {
    const rawData = new Uint8Array(50);
    for (let i = 0; i < 50; i++) rawData[i] = i * 3;

    const maskedData = xorBufferHeader(rawData);

    const transformStream = createUnmaskTransformStream();
    const reader = transformStream.readable.getReader();
    const writer = transformStream.writable.getWriter();

    // Write in chunks of 5 bytes each to stress boundary handling
    (async () => {
      for (let i = 0; i < maskedData.length; i += 5) {
        await writer.write(maskedData.slice(i, i + 5));
      }
      await writer.close();
    })();

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const c of chunks) {
      result.set(c, offset);
      offset += c.length;
    }

    expect(result).toEqual(rawData);
  });
});
