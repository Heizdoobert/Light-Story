import { readFileSync, existsSync, appendFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnv = resolve(__dirname, '../../.env');
const localEnv = resolve(__dirname, '../.env.local');

if (existsSync(rootEnv) && existsSync(localEnv)) {
  const localContent = readFileSync(localEnv, 'utf-8');
  const rootContent = readFileSync(rootEnv, 'utf-8');
  const lines = rootContent.split('\n').filter(Boolean);
  const missing = [];
  for (const line of lines) {
    if (line.startsWith('#') || !line.includes('=')) continue;
    const [key] = line.split('=');
    if (!localContent.includes(key)) {
      missing.push(line);
    }
  }
  if (missing.length > 0) {
    appendFileSync(localEnv, '\n' + missing.join('\n') + '\n');
  }
}
