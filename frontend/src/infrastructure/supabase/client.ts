/**
 * Infrastructure Layer - Supabase Client
 * Manages Supabase client initialization and configuration
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const supabaseFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init)
  } catch (error) {
    throw error
  }
}

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      global: {
        fetch: supabaseFetch,
      },
    })
  : null

export function createSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables not configured')
  }
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      fetch: supabaseFetch,
    },
  })
}

export function getSupabaseClient() {
  return supabase
}
