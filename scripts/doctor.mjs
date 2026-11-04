#!/usr/bin/env node
/**
 * Monorepo Doctor & Fast Diagnostic Engine for Light-Story
 * 
 * Checkpoints:
 * 1. [Node & Monorepo Env] Node >= 18 (recommended 20 or 22), core workspaces existence
 * 2. [Environment Parity] .env / frontend/.env parity vs .env.example / frontend/.env.example
 * 3. [TypeScript Matrix] Parallel tsc --noEmit across all 4 workspaces
 * 4. [Unit Test Fast Verification] Unit test suites across packages/sdk, workers/kv-worker, packages/ui
 * 5. [E2E & Boundaries Discovery] Existence and gitignore checks for E2E specifications
 * 6. [Distributed Trace Correlation] Integrity check across SDK, Edge Worker, Frontend
 * 7. [Summary Scorecard] ANSI visual summary scorecard and proper exit codes
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ANSI Color Helpers
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function pass(msg) {
  console.log(`  ${c.green}✓${c.reset} ${msg}`);
}

function fail(msg, errDetail = '') {
  console.log(`  ${c.red}✗${c.reset} ${c.bold}${msg}${c.reset}`);
  if (errDetail) {
    const lines = errDetail.trim().split('\n').slice(0, 6);
    console.log(`    ${c.red}${lines.join('\n    ')}${c.reset}`);
  }
}

function warn(msg) {
  console.log(`  ${c.yellow}⚠${c.reset} ${msg}`);
}

function info(msg) {
  console.log(`  ${c.cyan}ℹ${c.reset} ${c.dim}${msg}${c.reset}`);
}

function header(title) {
  console.log(`\n${c.bold}${c.cyan}▶ ${title}${c.reset}`);
}

/**
 * Execute command and return promise with exit code and output
 */
function execCommand(command, args, cwd = rootDir) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(command, args, {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
        durationMs: Date.now() - start,
      });
    });

    child.on('error', (err) => {
      resolve({
        code: 1,
        stdout,
        stderr: err.message,
        durationMs: Date.now() - start,
      });
    });
  });
}

/**
 * Parse environment key names from a .env file
 */
function parseEnvKeys(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const keys = new Set();
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        keys.add(trimmed.slice(0, eqIdx).trim());
      }
    }
    return keys;
  } catch {
    return new Set();
  }
}

async function main() {
  const globalStart = Date.now();
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;
  let warningChecks = 0;

  console.log(`\n${c.bold}${c.magenta}══════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}${c.magenta}   🩺 LIGHT-STORY MONOREPO DOCTOR & DIAGNOSTIC SHIELD        ${c.reset}`);
  console.log(`${c.bold}${c.magenta}══════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.dim}Root Directory: ${rootDir}${c.reset}`);
  console.log(`${c.dim}Node Version:   ${process.version}${c.reset}`);

  // ─────────────────────────────────────────────────────────────
  // 1. Check Node & Core Workspaces
  // ─────────────────────────────────────────────────────────────
  header('1. Node.js & Workspace Environment');
  totalChecks++;
  const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
  if (nodeMajor >= 18) {
    const isRecommended = nodeMajor === 20 || nodeMajor === 22;
    const note = isRecommended ? '(LTS 20/22 recommended)' : '(Node >= 18 compatible; Node 20 or 22 recommended)';
    pass(`Node.js version compatible: ${process.version} ${note}`);
    passedChecks++;
  } else {
    fail(`Node.js version incompatible: ${process.version}. Node >= 18 is required.`);
    failedChecks++;
  }

  const requiredDirs = [
    'frontend',
    'packages/sdk',
    'packages/ui',
    'workers/kv-worker',
    'backend-supabase',
  ];

  for (const dir of requiredDirs) {
    totalChecks++;
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      pass(`Workspace directory verified: ${dir}/`);
      passedChecks++;
    } else {
      fail(`Missing required workspace directory: ${dir}/`);
      failedChecks++;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Check Environment Variables Parity
  // ─────────────────────────────────────────────────────────────
  header('2. Environment Variables Parity');
  totalChecks++;
  
  // Root and Frontend env resolution
  const rootExample = path.join(rootDir, '.env.example');
  const rootEnv = fs.existsSync(path.join(rootDir, '.env')) 
    ? path.join(rootDir, '.env') 
    : (fs.existsSync(path.join(rootDir, '.env.local')) ? path.join(rootDir, '.env.local') : null);

  const feExample = path.join(rootDir, 'frontend/.env.example');
  const feEnv = fs.existsSync(path.join(rootDir, 'frontend/.env')) 
    ? path.join(rootDir, 'frontend/.env') 
    : (fs.existsSync(path.join(rootDir, 'frontend/.env.local')) ? path.join(rootDir, 'frontend/.env.local') : null);

  const detectedEnvs = [];
  if (rootEnv) detectedEnvs.push(path.relative(rootDir, rootEnv));
  if (feEnv) detectedEnvs.push(path.relative(rootDir, feEnv));

  if (detectedEnvs.length > 0) {
    pass(`Active environment files detected: ${detectedEnvs.join(', ')}`);
    passedChecks++;
  } else {
    warn('No .env or frontend/.env found. Using process environment variables or mock defaults.');
    warningChecks++;
  }

  // Parity inspection against examples
  if (fs.existsSync(feExample) && feEnv) {
    const exampleKeys = parseEnvKeys(feExample);
    const activeKeys = parseEnvKeys(feEnv);
    const missingKeys = [...exampleKeys].filter((k) => !activeKeys.has(k));
    
    if (missingKeys.length === 0) {
      info(`Frontend environment parity 100% matched with ${path.relative(rootDir, feExample)}`);
    } else {
      info(`Frontend env has ${missingKeys.length} unassigned example key(s): ${missingKeys.slice(0, 3).join(', ')}${missingKeys.length > 3 ? '...' : ''}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. TypeScript Compilation Matrix across all 4 workspaces (Parallel)
  // ─────────────────────────────────────────────────────────────
  header('3. Quad-Workspace TypeScript Matrix (Parallel tsc --noEmit)');
  const tsChecks = [
    { name: '@light-story/sdk', cmd: 'npx', args: ['--prefix', 'packages/sdk', 'tsc', '-p', 'packages/sdk/tsconfig.json', '--noEmit'] },
    { name: '@light-story/ui', cmd: 'npx', args: ['--prefix', 'packages/ui', 'tsc', '-p', 'packages/ui/tsconfig.json', '--noEmit'] },
    { name: 'workers/kv-worker', cmd: 'npx', args: ['--prefix', 'workers/kv-worker', 'tsc', '-p', 'workers/kv-worker/tsconfig.json', '--noEmit'] },
    { name: 'frontend (Next.js)', cmd: 'npm', args: ['--prefix', 'frontend', 'run', 'typecheck'] },
  ];

  console.log(`  ${c.dim}Dispatching parallel typecheck across 4 workspaces...${c.reset}`);
  const tsResults = await Promise.all(
    tsChecks.map(async (check) => {
      const res = await execCommand(check.cmd, check.args);
      return { check, res };
    })
  );

  for (const { check, res } of tsResults) {
    totalChecks++;
    if (res.code === 0) {
      pass(`${check.name} typecheck passed (${res.durationMs}ms)`);
      passedChecks++;
    } else {
      fail(`${check.name} typecheck failed (${res.durationMs}ms)`, res.stderr || res.stdout);
      failedChecks++;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Fast Unit Test Suites
  // ─────────────────────────────────────────────────────────────
  header('4. Unit Test Suites (Vitest)');
  const testChecks = [
    { name: '@light-story/sdk (Vitest)', cmd: 'npm', args: ['--prefix', 'packages/sdk', 'test'] },
    { name: 'workers/kv-worker (Vitest)', cmd: 'npm', args: ['--prefix', 'workers/kv-worker', 'test'] },
    { name: '@light-story/ui (Vitest)', cmd: 'npx', args: ['vitest', 'run', '--root', 'packages/ui'] },
    { name: 'frontend (Vitest Core)', cmd: 'npx', args: ['vitest', 'run', '--root', 'frontend', 'src/hooks/presenters/__tests__/presenter-cache.test.tsx', 'src/components/reader/ChapterImage.test.tsx', 'src/lib/cbz/cbz-reader.test.ts', 'src/actions/__tests__/result.test.ts'] },
  ];

  for (const test of testChecks) {
    totalChecks++;
    process.stdout.write(`  ${c.dim}Running ${test.name}...${c.reset}\r`);
    const res = await execCommand(test.cmd, test.args);
    if (res.code === 0) {
      pass(`${test.name} passed 100% (${res.durationMs}ms)`);
      passedChecks++;
    } else {
      fail(`${test.name} failed (${res.durationMs}ms)`, res.stderr || res.stdout);
      failedChecks++;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Playwright E2E & Boundaries Discovery
  // ─────────────────────────────────────────────────────────────
  header('5. Playwright E2E & Boundaries Discovery');
  const e2eSpecs = [
    'frontend/tests/e2e/smoke.spec.ts',
    'frontend/tests/e2e/auth-boundary.spec.ts',
  ];

  for (const spec of e2eSpecs) {
    totalChecks++;
    const specPath = path.join(rootDir, spec);
    if (fs.existsSync(specPath)) {
      // Check gitignore parity
      const ignoreCheck = await execCommand('git', ['check-ignore', spec]);
      if (ignoreCheck.code === 1) {
        pass(`E2E spec tracked & active: ${spec}`);
        passedChecks++;
      } else {
        warn(`E2E spec exists but is gitignored: ${spec}`);
        warningChecks++;
      }
    } else {
      fail(`Missing E2E test file: ${spec}`);
      failedChecks++;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Trace Correlation ID Integrity Check
  // ─────────────────────────────────────────────────────────────
  header('6. Distributed Trace Correlation ID Check');
  totalChecks++;
  const sdkClientFile = path.join(rootDir, 'packages/sdk/src/client.ts');
  const workerIndexFile = path.join(rootDir, 'workers/kv-worker/src/index.ts');
  const feErrorFile = path.join(rootDir, 'frontend/src/app/error.tsx');

  const hasSdkTrace = fs.existsSync(sdkClientFile) && fs.readFileSync(sdkClientFile, 'utf8').includes('x-request-id');
  const hasWorkerTrace = fs.existsSync(workerIndexFile) && fs.readFileSync(workerIndexFile, 'utf8').includes('x-request-id');
  const hasFeTrace = fs.existsSync(feErrorFile) && fs.readFileSync(feErrorFile, 'utf8').includes('traceId');

  if (hasSdkTrace && hasWorkerTrace && hasFeTrace) {
    pass('Trace Correlation ID (x-request-id) integrated across SDK, Edge Worker, and Frontend');
    passedChecks++;
  } else {
    fail('Trace Correlation ID integration incomplete', `SDK: ${hasSdkTrace}, Worker: ${hasWorkerTrace}, FE: ${hasFeTrace}`);
    failedChecks++;
  }

  // ─────────────────────────────────────────────────────────────
  // 7. Summary Scorecard
  // ─────────────────────────────────────────────────────────────
  const totalDuration = ((Date.now() - globalStart) / 1000).toFixed(2);
  console.log(`\n${c.bold}══════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bold}   DIAGNOSTIC SUMMARY SCORECARD                               ${c.reset}`);
  console.log(`${c.bold}══════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`  Total Checks:    ${c.bold}${totalChecks}${c.reset}`);
  console.log(`  Passed:          ${c.green}${c.bold}${passedChecks}${c.reset}`);
  console.log(`  Warnings:        ${warningChecks > 0 ? c.yellow : c.gray}${c.bold}${warningChecks}${c.reset}`);
  console.log(`  Failed:          ${failedChecks === 0 ? c.green : c.red}${c.bold}${failedChecks}${c.reset}`);
  console.log(`  Total Duration:  ${totalDuration}s`);
  console.log(`${c.bold}══════════════════════════════════════════════════════════════${c.reset}`);

  if (failedChecks === 0) {
    console.log(`\n${c.green}${c.bold}🎉 ALL SYSTEMS OPERATIONAL: Monorepo passed 100% of health checks.${c.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${c.red}${c.bold}❌ HEALTH CHECK FAILED: Please resolve the ${failedChecks} issue(s) above.${c.reset}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal Doctor Error:', err);
  process.exit(1);
});
