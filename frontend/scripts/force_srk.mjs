#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const rootEnv = 'D:/Light-Story/.env';
const target = 'D:/Light-Story/frontend/.env.local';
if (!fs.existsSync(rootEnv)) { console.error('root .env missing'); process.exit(1); }
const root = fs.readFileSync(rootEnv, 'utf8').split(/\r?\n/).find(l=>l.startsWith('SUPABASE_SERVICE_ROLE_KEY='));
if (!root) { console.error('SRK not found in root .env'); process.exit(2); }
const srk = root.replace(/^SUPABASE_SERVICE_ROLE_KEY=/,'');

let cur = '';
if (fs.existsSync(target)) {
  const raw = fs.readFileSync(target, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const non = lines.filter(l => !l.startsWith('SUPABASE_SERVICE_ROLE_KEY='));
  cur = non.join('\n') + '\n';
} else {
  cur = '';
}
cur += `SUPABASE_SERVICE_ROLE_KEY=${srk}\n`;
fs.writeFileSync(target, cur, 'utf8');
console.log('forced SRK into frontend/.env.local');
