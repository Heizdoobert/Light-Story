import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..', '..');
const scriptPath = path.resolve(repoRoot, 'cocoindex_repo.py');
const pythonBin = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

console.log(`[CocoIndex] Starting repository indexer using ${pythonBin}...`);

const proc = spawn(pythonBin, [scriptPath], {
  stdio: 'inherit',
  cwd: repoRoot,
});

proc.on('error', (err) => {
  console.error(`[CocoIndex] Failed to spawn ${pythonBin}:`, err.message);
  process.exit(1);
});

proc.on('close', (code) => {
  if (code !== 0) {
    console.error(`[CocoIndex] Script exited with code ${code}`);
    process.exit(code);
  }
  console.log('[CocoIndex] Repository indexing completed successfully.');
});
