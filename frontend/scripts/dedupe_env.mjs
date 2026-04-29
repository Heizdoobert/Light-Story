#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const target = path.resolve(process.cwd(), 'frontend', '.env.local');
if (!fs.existsSync(target)) {
  console.error('target .env.local not found', target);
  process.exit(1);
}
const raw = fs.readFileSync(target, 'utf8');
const lines = raw.split(/\r?\n/).filter(Boolean);
const others = lines.filter((l) => !l.startsWith('SUPABASE_SERVICE_ROLE_KEY='));
const last = lines.filter((l) => l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')).pop();
if (last) others.push(last);
fs.writeFileSync(target, others.join('\n') + '\n', 'utf8');
console.log('deduped .env.local');
