import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export const supabase: SupabaseClient | null =
  typeof window !== "undefined" ? getSupabaseBrowserClient() : null;

export function createSupabaseClient(): SupabaseClient {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Supabase environment variables not configured");
  return client;
}

export function getSupabaseClient(): SupabaseClient | null {
  return getSupabaseBrowserClient();
}

export default supabase;
