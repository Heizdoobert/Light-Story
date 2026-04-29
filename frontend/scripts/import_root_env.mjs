#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Find the repo root by walking up until we find a .env or a .git folder
function findUp(startDir) {
  let dir = startDir;
  while (true) {
    const checkEnv = path.join(dir, '.env');
    const checkGit = path.join(dir, '.git');
    if (fs.existsSync(checkEnv)) return checkEnv;
    if (fs.existsSync(checkGit)) {
      // if .env not present but .git found, check root .env
      const maybe = path.join(dir, '.env');
      if (fs.existsSync(maybe)) return maybe;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const rootEnv = findUp(process.cwd()) || path.resolve('D:/Light-Story/.env');
// Target the frontend/.env.local file in the repository
const targetEnv = path.resolve(process.cwd(), 'frontend', '.env.local');

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

// Copy public and vite keys, but do not overwrite SUPABASE_SERVICE_ROLE_KEY if present
const keysToCopy = ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','SUPABASE_URL'];
for (const k of keysToCopy) {
  if (entries[k]) existing[k] = entries[k];
}

const out = Object.entries(existing).map(([k,v]) => `${k}=${v}`);
fs.writeFileSync(targetEnv, out.join('\n') + '\n', 'utf8');
console.log('Imported root .env entries into frontend/.env.local (did not overwrite SUPABASE_SERVICE_ROLE_KEY if present).');
