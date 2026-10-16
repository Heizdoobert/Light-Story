import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase client initialization. Uses environment variables that are safe to expose to the client.
// NEXT_PUBLIC_* variables are automatically inlined by Next.js for client-side code.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Shared Supabase client for both frontend and server code.
 * In server contexts you can also provide a service role key via
 * `process.env.SUPABASE_SERVICE_ROLE_KEY` for elevated privileges.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
