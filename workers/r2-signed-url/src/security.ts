export function sanitizeR2Key(key: string): string | null {
  if (!key) return null;
  if (key.includes('..') || key.includes('//') || /[\x00-\x1F\x7F]/.test(key)) {
    return null;
  }
  return key.replace(/^\/+/, '');
}

export async function verifyHmacSignature(
  message: string,
  signatureHex: string,
  secretKey: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify', 'sign'],
    );

    const messageData = encoder.encode(message);
    const expectedSigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const expectedSigHex = Array.from(new Uint8Array(expectedSigBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return timingSafeEqual(expectedSigHex, signatureHex);
  } catch {
    return false;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function verifySignedUrl(
  url: URL,
  secretKey?: string,
): Promise<{ valid: boolean; reason?: string }> {
  if (!secretKey) return { valid: true };

  const expiresStr = url.searchParams.get('expires');
  const signature = url.searchParams.get('signature');

  if (!expiresStr || !signature) {
    return { valid: false, reason: 'Missing signature or expiration parameters' };
  }

  const expires = parseInt(expiresStr, 10);
  const now = Math.floor(Date.now() / 1000);

  if (isNaN(expires) || now > expires) {
    return { valid: false, reason: 'Signed URL has expired' };
  }

  const message = `GET:${url.pathname}:${expires}`;
  const isValidSig = await verifyHmacSignature(message, signature, secretKey);

  if (!isValidSig) {
    return { valid: false, reason: 'Invalid HMAC signature' };
  }

  return { valid: true };
}
