#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load frontend/.env.local first (use absolute repo path to avoid cwd issues)
dotenv.config({ path: path.resolve('D:/Light-Story/frontend/.env.local') });

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

async function checkSupabase() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local or repo .env');
    return { ok: false, code: 2 };
  }
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    console.log('Testing connection to', SUPABASE_URL);
    const { data, error } = await supabase.from('site_settings').select('key').limit(1);
    if (error) {
      console.error('Supabase error:', error.message || error);
      return { ok: false, code: 3 };
    }
    console.log('Success: able to query site_settings (rows):', Array.isArray(data) ? data.length : data);
    return { ok: true };
  } catch (e) {
    console.error('Unexpected error:', e?.message || e);
    return { ok: false, code: 4 };
  }
}

async function checkInternalRoutes() {
  const base = process.env.BASE_URL || 'http://localhost:3001';
  const endpoints = [
    { path: '/api/internal/admin/profiles', method: 'GET' },
    { path: '/api/internal/admin/audit', method: 'GET' },
  ];
  let failed = false;
  for (const e of endpoints) {
    const url = base + e.path;
    try {
      const res = await fetch(url, { method: e.method });
      if (res.status === 401 || res.status === 403) {
        console.log(`OK: ${e.method} ${e.path} -> ${res.status}`);
      } else {
        console.error(`WARN: ${e.method} ${e.path} -> expected 401/403, got ${res.status}`);
        failed = true;
      }
    } catch (err) {
      console.error(`ERROR: ${e.method} ${e.path} -> ${err.message}`);
      failed = true;
    }
  }
  if (failed) return { ok: false, code: 5 };
  console.log('All internal-route auth checks passed (or returned expected 401/403).');
  return { ok: true };
}

(async function main(){
  const supRes = await checkSupabase();
  if (!supRes.ok) {
    process.exitCode = supRes.code || 1;
    return;
  }
  const intRes = await checkInternalRoutes();
  if (!intRes.ok) {
    process.exitCode = intRes.code || 1;
    return;
  }
  console.log('All checks passed.');
})();
