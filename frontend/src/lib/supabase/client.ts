
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabaseFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (error) {
    throw error;
  }
};

// Suppress refresh token warnings (these are expected when session expires)
const originalWarn = console.warn;
const originalError = console.error;

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      global: {
        fetch: supabaseFetch,
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

if (!supabase) {
  console.warn('Supabase credentials missing. RBAC and Data fetching will be disabled.');
} else {
  // Suppress known benign warnings about refresh tokens
  console.warn = (...args: any[]) => {
    const msg = String(args[0] || '');
    if (msg.includes('Invalid Refresh Token') || msg.includes('Refresh Token Not Found')) {
      return; // suppress
    }
    originalWarn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    const msg = String(args[0] || '');
    if (msg.includes('Invalid Refresh Token') || msg.includes('Refresh Token Not Found')) {
      return; // suppress
    }
    originalError.apply(console, args);
  };
}

export default supabase;
