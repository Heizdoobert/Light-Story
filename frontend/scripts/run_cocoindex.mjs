import { spawnSync } from 'child_process';
import path from 'path';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const scriptPath = path.resolve(repoRoot, 'cocoindex_repo.py');
const pythonBin = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

console.log(`[CocoIndex] Starting repository indexer using ${pythonBin}...`);

const result = spawnSync(pythonBin, [scriptPath], {
  stdio: 'inherit',
  cwd: repoRoot,
});

if (result.error) {
  console.error(`[CocoIndex] Failed to spawn ${pythonBin}:`, result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`[CocoIndex] Script exited with code ${result.status}`);
  process.exit(result.status ?? 1);
}

console.log('[CocoIndex] Repository indexing completed successfully.');
