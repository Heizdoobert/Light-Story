#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Write .env.local in the current working directory (when run with npm --prefix frontend)
const envPath = path.resolve(process.cwd(), '.env.local');
// Defaults for Supabase local emulator
const EMULATOR_URL = process.env.SUPABASE_EMULATOR_URL || 'http://localhost:54321';
const EMULATOR_SERVICE_ROLE = process.env.SUPABASE_EMULATOR_SERVICE_ROLE || 'service_role_emulator_key';
const ANON_KEY = process.env.SUPABASE_EMULATOR_ANON || 'anon_emulator_key';

const lines = [
  `SUPABASE_URL=${EMULATOR_URL}`,
  `NEXT_PUBLIC_SUPABASE_URL=${EMULATOR_URL}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}`,
  `VITE_SUPABASE_URL=${EMULATOR_URL}`,
  `VITE_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}`,
  `SUPABASE_SERVICE_ROLE_KEY=${EMULATOR_SERVICE_ROLE}`,
  `INTERNAL_ADMIN_SECRET=internal-secret-placeholder`
];

fs.writeFileSync(envPath, lines.join('\n') + '\n', { encoding: 'utf8', flag: 'w' });
console.log('Wrote emulator env to frontend/.env.local');
