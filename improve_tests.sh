#!/usr/bin/env bash
set -e
MAX_RETRIES=3

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

run_with_retry() {
  local cmd="$1"
  local attempt=1
  until eval "$cmd"; do
    ((attempt++))
    if (( attempt > MAX_RETRIES )); then
      echo "Command failed after $MAX_RETRIES attempts: $cmd" >&2
      exit 1
    fi
    echo "Retry $attempt/$MAX_RETRIES for: $cmd"
    sleep 2
  done
}

# Step 1 – UI Unit Tests
run_with_retry "npm --prefix packages/ui run test:unit"

# Step 2 – End-to-End Comic Upload Flow
run_with_retry "npm --prefix frontend run test:e2e:comic-upload"

# Step 3 – Security Tests for Server Actions
run_with_retry "npm --prefix frontend run test:security"

# Step 4 – CI Matrix Configuration (generate snippet)
cat <<'EOF' > .github/workflows/ci.yml
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
EOF

echo "CI matrix configuration written to .github/workflows/ci.yml"
