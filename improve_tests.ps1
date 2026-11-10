# PowerShell script to run test improvement steps with retry
$ErrorActionPreference = 'Stop'
$MaxRetries = 3

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = $PSScriptRoot }
if ($ScriptDir) { Set-Location $ScriptDir }

function Run-WithRetry([string]$command) {
    $attempt = 1
    while ($true) {
        Write-Host "Executing: $command (attempt $attempt/$MaxRetries)"
        cmd /c "$command"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Success: $command"
            break
        }
        if ($attempt -ge $MaxRetries) {
            Write-Error "Command failed after $MaxRetries attempts: $command (exit code $LASTEXITCODE)"
            exit 1
        }
        $attempt++
        Write-Host "Retry $attempt/$MaxRetries for: $command"
        Start-Sleep -Seconds 2
    }
}

# Step 1 – UI Unit Tests
Run-WithRetry "npm --prefix packages/ui run test:unit"

# Step 2 – End-to-End Comic Upload Flow
Run-WithRetry "npm --prefix frontend run test:e2e:comic-upload"

# Step 3 – Security Tests for Server Actions
Run-WithRetry "npm --prefix frontend run test:security"

# Step 4 – Generate CI matrix configuration
@'
name: Light-Story Test Matrix CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: [main]

jobs:
  ui-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm --prefix packages/ui run test:unit

  server-security:
    runs-on: ubuntu-latest
    needs: ui-unit
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm --prefix frontend run test:security

  e2e-comic:
    runs-on: ubuntu-latest
    needs: server-security
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm --prefix frontend run test:e2e:comic-upload

  full-stack:
    runs-on: ubuntu-latest
    needs: e2e-comic
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run ci:full
'@ | Set-Content -Path ".github/workflows/ci.yml" -Encoding utf8
Write-Host "CI matrix configuration written to .github/workflows/ci.yml"
