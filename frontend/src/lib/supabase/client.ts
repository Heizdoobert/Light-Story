import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let clientInstance: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (clientInstance) {
    return clientInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.warn(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
    return null as unknown as SupabaseClient;
  }

  clientInstance = createBrowserClient(url, key) as unknown as SupabaseClient;
  return clientInstance;
}

export function getSupabaseBrowserClient(): SupabaseClient {
  return createClient();
}

export const supabase =
  typeof window !== "undefined"
    ? (() => { try { return createClient(); } catch { return null; } })()
    : (null as unknown as SupabaseClient);
