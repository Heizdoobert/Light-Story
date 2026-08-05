import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase: SupabaseClient | null = supabaseUrl && supabaseKey
  ? (createBrowserClient(supabaseUrl, supabaseKey) as unknown as SupabaseClient)
  : null;

export function createSupabaseClient(): SupabaseClient {
  if (!supabase) throw new Error('Supabase environment variables not configured');
  return supabase;
}

export function getSupabaseClient() {
  return supabase;
}

export default supabase;
