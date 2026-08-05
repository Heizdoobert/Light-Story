import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let clientInstance: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (clientInstance) {
    return clientInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "placeholder-key";

  clientInstance = createBrowserClient(url, key) as unknown as SupabaseClient;
  return clientInstance;
}

export function getSupabaseBrowserClient(): SupabaseClient {
  return createClient();
}

export const supabase = typeof window !== "undefined" ? createClient() : null as unknown as SupabaseClient;
