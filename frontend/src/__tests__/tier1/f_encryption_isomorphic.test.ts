// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { encryptFieldClient, decryptFieldClient } from '@/lib/security/encryption';

const TEST_SECRET = 'test-secret-key-1234567890';

describe('encryption (isomorphic round-trip)', () => {
  it('round-trips text through encrypt -> decrypt with the same key', async () => {
    const text = JSON.stringify(['https://r2.test/a.webp', 'https://r2.test/b.webp']);
    const encrypted = await encryptFieldClient(text, TEST_SECRET);
    expect(encrypted.startsWith('ENCv1:')).toBe(true);
    const decrypted = await decryptFieldClient(encrypted, TEST_SECRET);
    expect(decrypted).toBe(text);
  });

  it('returns plaintext unchanged when not ENCv1-prefixed', async () => {
    expect(await decryptFieldClient('https://r2.test/a.webp', TEST_SECRET)).toBe(
      'https://r2.test/a.webp',
    );
  });

  it('does not re-encrypt existing ENCv1 payloads', async () => {
    const first = await encryptFieldClient('already', TEST_SECRET);
    const second = await encryptFieldClient(first, TEST_SECRET);
    expect(second).toBe(first);
  });

  it('returns input unchanged when decrypting with the wrong key', async () => {
    const encrypted = await encryptFieldClient('secret-content', TEST_SECRET);
    const result = await decryptFieldClient(encrypted, 'wrong-key');
    expect(result).toBe(encrypted);
  });
});
