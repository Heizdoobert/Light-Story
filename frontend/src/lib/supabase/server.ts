import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
let _clientSignature: string | null = null;

type SupabaseServerConfig = {
  url: string | undefined;
  publicKey: string | undefined;
  hasServiceKey: boolean;
  isPlaceholderKey: boolean;
  selectedKey: string | undefined;
  signature: string;
};

function getSupabaseServerConfig(): SupabaseServerConfig {
  const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const SUPABASE_PUBLIC_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  const resolvedServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    SUPABASE_SERVICE_ROLE_KEY;

  const serviceKeyLower = (resolvedServiceKey || '').toLowerCase();
  const isPlaceholderKey = /placeholder|emulator|publishable|sb_publishable_|anon_|service-role-key|change-me|your-service-key|^test-/i.test(serviceKeyLower);
  const hasServiceKey = Boolean(resolvedServiceKey) && !isPlaceholderKey;
  const selectedKey = hasServiceKey ? (resolvedServiceKey as string) : SUPABASE_PUBLIC_KEY;
  const keyKind = hasServiceKey ? 'service' : 'publishable';
  const signature = `${SUPABASE_URL || 'missing-url'}|${keyKind}|${selectedKey ? selectedKey.slice(0, 12) : 'missing-key'}`;

  return {
    url: SUPABASE_URL,
    publicKey: SUPABASE_PUBLIC_KEY,
    hasServiceKey,
    isPlaceholderKey,
    selectedKey,
    signature,
  };
}

export function getServerSupabase(): SupabaseClient | null {
  const config = getSupabaseServerConfig();

  if (_client && _clientSignature === config.signature) {
    return _client;
  }

  if (!config.url || !config.publicKey) {
    // Do not throw at import-time; return null so callers can handle missing config during build/dev.
    // eslint-disable-next-line no-console
    const envKeys = Object.keys(process.env).filter((k) => /SUPABASE|VITE|NEXT_PUBLIC/i.test(k));
    console.warn('frontend: server supabase client missing env vars', {
      hasUrl: !!config.url,
      hasPublicKey: !!config.publicKey,
      hasServiceKey: config.hasServiceKey,
      isPlaceholderKey: config.isPlaceholderKey,
      foundEnvKeys: envKeys,
    });
    _client = null;
    _clientSignature = null;
    return null;
  }

  if (!config.hasServiceKey) {
    // eslint-disable-next-line no-console
    const envKeys = Object.keys(process.env).filter((k) => /SUPABASE|VITE|NEXT_PUBLIC/i.test(k));
    console.warn('frontend: server supabase client using publishable key fallback because service role key is missing or placeholder', {
      hasUrl: !!config.url,
      hasPublicKey: !!config.publicKey,
      hasServiceKey: config.hasServiceKey,
      isPlaceholderKey: config.isPlaceholderKey,
      foundEnvKeys: envKeys,
    });
  }

  _client = createClient(config.url, config.selectedKey as string, { auth: { persistSession: false } });
  _clientSignature = config.signature;
  return _client;
}

export function getServerSupabaseForRequest(request: { headers: { get(name: string): string | null } }): SupabaseClient | null {
  const config = getSupabaseServerConfig();
  if (!config.url || !config.publicKey) return null;

  if (config.hasServiceKey) {
    return getServerSupabase();
  }

  const authorization = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return getServerSupabase();
  }

  return createClient(config.url, config.publicKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function hasServerSupabaseServiceRoleKey(): boolean {
  return getSupabaseServerConfig().hasServiceKey;
}

export default getServerSupabase;
