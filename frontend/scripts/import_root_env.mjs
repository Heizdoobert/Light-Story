#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Find the repo root by walking up until we find a .git folder.
function findRepoRoot(startDir) {
  let dir = startDir;
  while (true) {
    const checkGit = path.join(dir, '.git');
    if (fs.existsSync(checkGit)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const repoRoot = findRepoRoot(process.cwd()) || path.resolve('D:/Light-Story');
const rootEnvLocal = path.join(repoRoot, '.env.local');
const rootEnvDefault = path.join(repoRoot, '.env');
const rootEnv = fs.existsSync(rootEnvLocal) ? rootEnvLocal : rootEnvDefault;
const targetEnv = path.join(repoRoot, 'frontend', '.env.local');

if (!fs.existsSync(rootEnv)) {
  console.error('Root .env not found at', rootEnv);
  process.exit(1);
}

const raw = fs.readFileSync(rootEnv, 'utf8');
const lines = raw.split(/\r?\n/).filter(Boolean);
const entries = {};
for (const l of lines) {
  const m = l.match(/^([^=]+)=(.*)$/);
  if (!m) continue;
  entries[m[1]] = m[2];
}

let existing = {};
if (fs.existsSync(targetEnv)) {
  const cur = fs.readFileSync(targetEnv, 'utf8').split(/\r?\n/).filter(Boolean);
  for (const l of cur) {
    const m = l.match(/^([^=]+)=(.*)$/);
    if (m) existing[m[1]] = m[2];
  }
}

// Copy keys required by frontend runtime and internal proxy routes.
const keysToCopy = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_URL',
  'BACKEND_D1_SAAS_URL',
  'BACKEND_D1_SAAS_ADMIN_KEY',
  'NEXT_PUBLIC_R2_BUCKET_COVERS',
  'NEXT_PUBLIC_R2_BUCKET_CHAPTERS',
  'ENABLE_LOCAL_DEV_FALLBACK',
  'NEXT_PUBLIC_ENABLE_LOCAL_DEV_FALLBACK',
];
for (const k of keysToCopy) {
  if (entries[k]) existing[k] = entries[k];
}

const out = Object.entries(existing).map(([k,v]) => `${k}=${v}`);
fs.writeFileSync(targetEnv, out.join('\n') + '\n', 'utf8');
console.log('Imported selected root env entries into frontend/.env.local.');
