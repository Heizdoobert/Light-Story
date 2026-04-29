import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

let _client: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient | null {
  if (_client) return _client;
  const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const SUPABASE_PUBLIC_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  // If key is missing, attempt to load a repo-root `.env` file (falls back to workspace root).
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    try {
      // Walk up from cwd to find a .env or .git marker (similar to scripts/import_root_env.mjs)
      let dir = process.cwd();
      let found = null;
      while (dir) {
        const maybe = path.join(dir, '.env');
        const maybeGit = path.join(dir, '.git');
        if (fs.existsSync(maybe)) { found = maybe; break; }
        if (fs.existsSync(maybeGit) && fs.existsSync(maybe)) { found = maybe; break; }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
      // last-resort: common workspace path
      if (!found) {
        const fallback = path.resolve('D:/Light-Story/.env');
        if (fs.existsSync(fallback)) found = fallback;
      }

      if (found) {
        dotenv.config({ path: found });
      }
    } catch (err) {
      // ignore errors reading root env
    }
  }

  // Re-evaluate key after attempting to load repo .env
  const resolvedServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    SUPABASE_SERVICE_ROLE_KEY;

  // Treat obvious placeholder/emulator or publishable values as not configured so dev fallback will be used.
  const serviceKeyLower = (resolvedServiceKey || '').toLowerCase();
  const isPlaceholderKey = /placeholder|emulator|publishable|sb_publishable_|anon_|service-role-key|change-me|your-service-key|^test-/i.test(serviceKeyLower);

  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    // Do not throw at import-time; return null so callers can handle missing config during build/dev.
    // eslint-disable-next-line no-console
    const envKeys = Object.keys(process.env).filter((k) => /SUPABASE|VITE|NEXT_PUBLIC/i.test(k));
    console.warn('frontend: server supabase client missing env vars', {
      hasUrl: !!SUPABASE_URL,
      hasPublicKey: !!SUPABASE_PUBLIC_KEY,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      isPlaceholderKey,
      foundEnvKeys: envKeys,
    });

    _client = null;
    return _client;
  }

  if (!resolvedServiceKey || isPlaceholderKey) {
    // Do not throw at import-time; return null so callers can handle missing config during build/dev.
    // eslint-disable-next-line no-console
    const envKeys = Object.keys(process.env).filter((k) => /SUPABASE|VITE|NEXT_PUBLIC/i.test(k));
    console.warn('frontend: server supabase client using public key fallback', {
      hasUrl: !!SUPABASE_URL,
      hasPublicKey: !!SUPABASE_PUBLIC_KEY,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      isPlaceholderKey,
      foundEnvKeys: envKeys,
    });

    _client = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, { auth: { persistSession: false } });
    return _client;
  }

  _client = createClient(SUPABASE_URL, resolvedServiceKey as string, { auth: { persistSession: false } });
  return _client;
}

export default getServerSupabase;
