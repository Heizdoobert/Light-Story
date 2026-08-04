import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing enviroment key SUPABASE (url/anon_key)");
  }

  return createBrowserClient(url, key);
}

export function getSupabaseBrowserClient() {
  return createClient();
}

export function createSupabaseBrowserClient() {
  return createClient();
}

export const supabase = createClient();
