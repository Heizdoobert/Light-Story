import { supabase as libSupabase, createClient, getSupabaseBrowserClient } from '@/lib/supabase/client';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

// Fallback client for test/build environments if libSupabase is null
const getFallbackClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'mock-key';
  return createSupabaseClient(url, key);
};

export const supabase: SupabaseClient = libSupabase || getFallbackClient();
export { createClient, getSupabaseBrowserClient };
export type { SupabaseClient };
export default supabase;
