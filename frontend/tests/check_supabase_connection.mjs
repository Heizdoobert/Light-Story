import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local first, then fall back to a repo-root .env if SRK is missing
dotenv.config({ path: '.env.local' });

function findRootEnv(startDir) {
  let dir = startDir;
  while (true) {
    const checkEnv = path.join(dir, '.env');
    const checkGit = path.join(dir, '.git');
    if (fs.existsSync(checkEnv)) return checkEnv;
    if (fs.existsSync(checkGit)) {
      const maybe = path.join(dir, '.env');
      if (fs.existsSync(maybe)) return maybe;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
let SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  const rootEnv = findRootEnv(process.cwd()) || path.resolve('D:/Light-Story/.env');
  if (rootEnv && fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
    SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  }
}

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local or repo .env');
  process.exit(2);
}

(async function main(){
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    console.log('Testing connection to', SUPABASE_URL);
    const { data, error } = await supabase.from('site_settings').select('key').limit(1);
    if (error) {
      console.error('Supabase error:', error.message || error);
      process.exit(3);
    }
    console.log('Success: able to query site_settings (rows):', Array.isArray(data) ? data.length : data);
    process.exit(0);
  } catch (e) {
    console.error('Unexpected error:', e?.message || e);
    process.exit(4);
  }
})();
