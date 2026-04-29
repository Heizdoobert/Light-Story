#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Write .env.local in the current working directory (when run with npm --prefix frontend)
const envPath = path.resolve(process.cwd(), '.env.local');
const args = process.argv.slice(2);
const keyFromArg = args[0];
const urlFromArg = args[1];
const key = process.env.SERVICE_ROLE_KEY || keyFromArg;
const url = process.env.SUPABASE_URL || urlFromArg;

if (!key) {
  console.error('Usage: SERVICE_ROLE_KEY=<key> node ./scripts/add_service_key.mjs <key> <supabase_url>\nOr provide SERVICE_ROLE_KEY env var.');
  process.exit(1);
}

let content = '';
if (fs.existsSync(envPath)) {
  content = fs.readFileSync(envPath, 'utf8');
}

const lines = content.split(/\r?\n/).filter(Boolean).filter((l) => !/^SUPABASE_SERVICE_ROLE_KEY=/.test(l) && !/^SUPABASE_URL=/.test(l));
lines.push(`SUPABASE_SERVICE_ROLE_KEY=${key}`);
if (url) lines.push(`SUPABASE_URL=${url}`);

fs.writeFileSync(envPath, lines.join('\n') + '\n', { encoding: 'utf8', flag: 'w' });
console.log('Wrote service role key to frontend/.env.local (not committed).');
