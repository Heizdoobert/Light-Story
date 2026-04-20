import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const env = import.meta.env as Record<string, string | undefined>
  const supabaseUrl = env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or publishable key in environment variables.')
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseKey
  )
}
