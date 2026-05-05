/**
 * Infrastructure Layer - Supabase Client
 * Reuses the shared browser client to avoid multiple GoTrueClient instances.
 */

import defaultSupabase, { supabase as sharedSupabase } from '@/lib/supabase/client';

export const supabase = sharedSupabase;

export function createSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase environment variables not configured');
  }
  return supabase;
}

export function getSupabaseClient() {
  return supabase;
}

export default defaultSupabase;
