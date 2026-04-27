import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const DEV_PORT = 3001;

function getPidsOnPortWindows(port) {
  const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  return [...new Set(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(/\s+/).at(-1))
      .filter((pid) => pid && /^\d+$/.test(pid))
      .map((pid) => Number(pid))
      .filter((pid) => pid > 0 && pid !== process.pid),
  )];
}

function stopPids(pids) {
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
      console.log(`Killed process on :${DEV_PORT} -> PID ${pid}`);
    } catch {
      // Ignore stale/permission-denied PIDs.
    }
  }
}

try {
  if (process.platform === 'win32') {
    stopPids(getPidsOnPortWindows(DEV_PORT));
  }
} catch {
  // Ignore lookup failures and continue with cache cleanup.
}

try {
  rmSync('.next-dev', { recursive: true, force: true });
  console.log('Cleared .next-dev cache');
} catch {
  // Best-effort cleanup.
}
