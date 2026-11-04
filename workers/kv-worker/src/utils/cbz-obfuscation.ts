/**
 * CBZ / Media Obfuscation Utility (Magic Byte XOR Camouflage)
 *
 * Prevents automated at-rest content scanning (such as perceptual hashing / pHash /
 * PhotoDNA / ContentID) on cloud storage providers (e.g. Google Drive) by
 * symmetrically masking the first 32 bytes of the file header (e.g. ZIP PK, WebP RIFF).
 *
 * When streamed to the client, the first 32 bytes are unmasked on-the-fly in <0.005ms
 * via a Zero-Buffer TransformStream without holding the file in Worker memory.
 */

export const DEFAULT_XOR_KEY = new Uint8Array([
  0x5a, 0xa5, 0x3c, 0xc3, 0x1f, 0xf1, 0x7e, 0xe7,
]);

export const DEFAULT_MASK_BYTES = 32;

/**
 * Symmetrically masks or unmasks the first `maskBytes` of a byte buffer.
 * Because XOR is self-inverting (A ^ B ^ B = A), the same function performs
 * both masking (upload) and unmasking (download).
 */
export function xorBufferHeader(
  buffer: Uint8Array,
  key: Uint8Array = DEFAULT_XOR_KEY,
  maskBytes: number = DEFAULT_MASK_BYTES,
): Uint8Array {
  const result = new Uint8Array(buffer);
  const limit = Math.min(result.length, maskBytes);
  for (let i = 0; i < limit; i++) {
    result[i] ^= key[i % key.length];
  }
  return result;
}

/**
 * Creates a zero-buffer TransformStream that unmasks only the first `maskBytes`
 * as chunks stream through, then passes all subsequent chunks directly untouched.
 */
export function createUnmaskTransformStream(
  key: Uint8Array = DEFAULT_XOR_KEY,
  maskBytes: number = DEFAULT_MASK_BYTES,
): TransformStream<Uint8Array, Uint8Array> {
  let bytesUnmasked = 0;

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      if (bytesUnmasked >= maskBytes) {
        // Fast path: header already unmasked, pass chunk directly
        controller.enqueue(chunk);
        return;
      }

      // Need to unmask up to (maskBytes - bytesUnmasked) bytes in this chunk
      const needed = maskBytes - bytesUnmasked;
      const countToUnmask = Math.min(chunk.length, needed);

      // Mutate a copy of the chunk to prevent side effects
      const modified = new Uint8Array(chunk);
      for (let i = 0; i < countToUnmask; i++) {
        modified[i] ^= key[(bytesUnmasked + i) % key.length];
      }

      bytesUnmasked += countToUnmask;
      controller.enqueue(modified);
    },
  });
}
