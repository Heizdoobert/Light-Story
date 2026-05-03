
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

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      global: {
        fetch: supabaseFetch,
      },
    })
  : null;

if (!supabase) {
  console.warn('Supabase credentials missing. RBAC and Data fetching will be disabled.');
}

export default supabase;
