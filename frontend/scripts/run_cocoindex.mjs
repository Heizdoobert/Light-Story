// Run the CocoIndex repo indexing script
// Uses the system Python interpreter to execute cocoindex_repo.py
const { spawn } = require('child_process');
const path = require('path');

// Resolve the path to the Python script relative to this file
const scriptPath = path.resolve(__dirname, '..', 'cocoindex_repo.py');

const proc = spawn('python', [scriptPath], { stdio: 'inherit' });

proc.on('close', (code) => {
  if (code !== 0) {
    console.error(`cocoindex script exited with code ${code}`);
    process.exit(code);
  }
});
