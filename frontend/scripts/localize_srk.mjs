#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const rootEnv = path.resolve('D:/Light-Story/.env');
if (!fs.existsSync(rootEnv)) {
  console.error('root .env not found at', rootEnv);
  process.exit(1);
}

const raw = fs.readFileSync(rootEnv, 'utf8');
const lines = raw.split(/\r?\n/);
const srkLine = lines.find((l) => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='));
if (!srkLine) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in root .env');
  process.exit(2);
}
const srk = srkLine.replace(/^SUPABASE_SERVICE_ROLE_KEY=/, '');

const target = path.resolve(process.cwd(), 'frontend', '.env.local');
let cur = '';
if (fs.existsSync(target)) cur = fs.readFileSync(target, 'utf8');

if (/^SUPABASE_SERVICE_ROLE_KEY=/m.test(cur)) {
  cur = cur.replace(/^SUPABASE_SERVICE_ROLE_KEY=.*$/m, `SUPABASE_SERVICE_ROLE_KEY=${srk}`);
} else {
  if (cur.length && !cur.endsWith('\n')) cur += '\n';
  cur += `SUPABASE_SERVICE_ROLE_KEY=${srk}\n`;
}

fs.writeFileSync(target, cur, 'utf8');
console.log('frontend/.env.local updated with SUPABASE_SERVICE_ROLE_KEY');
