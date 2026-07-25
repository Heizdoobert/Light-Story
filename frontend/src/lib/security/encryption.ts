/**
 * Client-Side AES-256-GCM Decryption & Encryption Utility
 */

const DEFAULT_SECRET = 'light-story-master-secret-key-32b!';

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret.padEnd(32, '!').slice(0, 32));
  return await window.crypto.subtle.importKey(
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

export async function encryptFieldClient(text: string, secret: string = DEFAULT_SECRET): Promise<string> {
  if (!text || typeof text !== 'string') return text;
  if (text.startsWith('ENCv1:')) return text;

  try {
    const key = await getKey(secret);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(text)
    );

    return `ENCv1:${bufferToBase64(iv.buffer)}:${bufferToBase64(ciphertext)}`;
  } catch (error) {
    console.error('Client encryption failed:', error);
    return text;
  }
}

export async function decryptFieldClient(encryptedText: string, secret: string = DEFAULT_SECRET): Promise<string> {
  if (!encryptedText || typeof encryptedText !== 'string' || !encryptedText.startsWith('ENCv1:')) {
    return encryptedText;
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;

    const ivBuf = base64ToBuffer(parts[1]);
    const cipherBuf = base64ToBuffer(parts[2]);
    const key = await getKey(secret);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(ivBuf) },
      key,
      cipherBuf
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (error) {
    console.error('Client decryption failed:', error);
    return encryptedText;
  }
}

