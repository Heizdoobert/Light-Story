import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Create a singleton Supabase client instance.
// The environment variables are defined in .env.local and must be prefixed with NEXT_PUBLIC_ for client‑side code.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || (process.env.NODE_ENV === 'test' ? 'https://mock.supabase.co' : '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (process.env.NODE_ENV === 'test' ? 'mock-anon-key' : '');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or anon key is missing. Check your environment variables.');
}

/**
 * Supabase client used throughout the SDK.
 * The generic type parameter can be supplied by callers to get full type safety
 * when they have generated types via `supabase gen types typescript`.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
