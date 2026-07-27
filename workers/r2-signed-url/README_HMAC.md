HMAC Signed URL pattern for R2 Worker

Usage:
1. Bind secret as `ASSETS_SIGN_SECRET` in wrangler.toml for the Worker.
2. Generate signed URLs server-side using HMAC-SHA256 over `${key}:${expiry}` and append `?sig=<hex>.<expiryEpochMs>`.
3. Worker verifies signature and expiry using SubtleCrypto.

Example server-side generator (Node.js):
```js
import crypto from 'crypto';
function signR2Key(key, expiryMs, secret) {
  const payload = `${key}:${expiryMs}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${sig}.${expiryMs}`;
}
```

Security notes:
- Keep `ASSETS_SIGN_SECRET` in your secrets manager and rotate if compromised.
- Use short expiry (e.g., 60s) for VIP assets.
- Consider including `uid` in the payload if you want per-user tokens (e.g., `${key}:${uid}:${expiry}`).
