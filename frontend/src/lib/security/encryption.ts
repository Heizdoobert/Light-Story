/**
 * AES-256-GCM Field Encryption (isomorphic: browser + Node server)
 */

const DEFAULT_SECRET = process.env.NEXT_PUBLIC_ENC_KEY || "";

function getCrypto(): Crypto {
  return typeof window !== "undefined" ? window.crypto : globalThis.crypto;
}

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret.padEnd(32, '!').slice(0, 32));
  return await getCrypto().subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufferToBase64(buf: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buf).toString("base64");
  }
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(b64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }
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
    const iv = getCrypto().getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await getCrypto().subtle.encrypt(
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

  if (!secret) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        'decryptFieldClient: NEXT_PUBLIC_ENC_KEY is unset but ENCv1 content found — decryption will fail',
      );
    }
    return encryptedText;
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;

    const ivBuf = base64ToBuffer(parts[1]);
    const cipherBuf = base64ToBuffer(parts[2]);
    const key = await getKey(secret);

    const decrypted = await getCrypto().subtle.decrypt(
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
