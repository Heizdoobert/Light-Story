import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the path to the Python script relative to this file
const scriptPath = path.resolve(__dirname, '..', '..', 'cocoindex_repo.py');

const proc = spawn('python', [scriptPath], { stdio: 'inherit', cwd: path.resolve(__dirname, '..', '..') });

proc.on('close', (code) => {
  if (code !== 0) {
    console.error(`cocoindex script exited with code ${code}`);
    process.exit(code);
  }
});
