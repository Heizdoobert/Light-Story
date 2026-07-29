/**
 * AES-256-GCM Web Crypto Field Encryption & Decryption Utility
 * secret must be at least 32 chars
 */

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret.padEnd(32, '!').slice(0, 32));
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypts a text string using AES-256-GCM.
 * Output format: ENCv1:<iv_b64>:<ciphertext_b64>
 */
export async function encryptField(text: string, secret: string): Promise<string> {
  if (!text) return text;
  if (text.startsWith('ENCv1:')) return text; // already encrypted

  try {
    const key = await getKey(secret);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(text)
    );

    return `ENCv1:${bufferToBase64(iv.buffer)}:${bufferToBase64(ciphertext)}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    return text;
  }
}

/**
 * Decrypts an ENCv1 encrypted string back into plaintext.
 */
export async function decryptField(encryptedText: string, secret: string): Promise<string> {
  if (!encryptedText || !encryptedText.startsWith('ENCv1:')) return encryptedText;

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;

    const ivBuf = base64ToBuffer(parts[1]);
    const cipherBuf = base64ToBuffer(parts[2]);
    const key = await getKey(secret);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(ivBuf) },
      key,
      cipherBuf
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedText;
  }
}
