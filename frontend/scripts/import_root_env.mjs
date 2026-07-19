import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnv = resolve(__dirname, '../../.env');
const localEnv = resolve(__dirname, '../.env.local');

try {
  const rootContent = readFileSync(rootEnv, 'utf-8');
  let localContent = '';
  try {
    localContent = readFileSync(localEnv, 'utf-8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

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
    const suffix = '\n' + missing.join('\n') + '\n';
    const tmpFile = `${localEnv}.${process.pid}.tmp`;
    writeFileSync(tmpFile, localContent + suffix, 'utf-8');
    try {
      renameSync(tmpFile, localEnv);
    } catch (renameErr) {
      try {
        unlinkSync(tmpFile);
      } catch {}
      writeFileSync(localEnv, localContent + suffix, 'utf-8');
    }
  }
} catch (err) {
  if (err.code !== 'ENOENT') {
    throw err;
  }
}
