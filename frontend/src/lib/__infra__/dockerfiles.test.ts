import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../../');

function readFile(name: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, name), 'utf-8');
}

describe('Dockerfile (root, combined frontend build)', () => {
  const content = readFile('Dockerfile');

  it('builds from a slim base image instead of alpine', () => {
    expect(content).toMatch(/FROM node:\$\{NODE_VERSION\}-slim AS build/);
    expect(content).not.toMatch(/FROM node:\$\{NODE_VERSION\}-alpine AS build/);
  });

  it('removes committed lockfiles before installing', () => {
    expect(content).toMatch(/rm -f package-lock\.json frontend\/package-lock\.json/);
  });

  it('installs dependencies with --legacy-peer-deps', () => {
    expect(content).toMatch(/npm install --legacy-peer-deps/);
  });

  it('still keeps the npm cache mount for the install step', () => {
    expect(content).toMatch(/--mount=type=cache,target=\/root\/\.npm/);
  });

  it('keeps the lockfile removal and install within the same RUN instruction as the cache mount', () => {
    const runBlockMatch = content.match(
      /RUN --mount=type=cache,target=\/root\/\.npm \\\n\s*rm -f package-lock\.json frontend\/package-lock\.json && \\\n\s*npm install --legacy-peer-deps/,
    );
    expect(runBlockMatch).not.toBeNull();
  });

  it('still uses the alpine image for the final production stage', () => {
    expect(content).toMatch(/FROM node:\$\{NODE_VERSION\}-alpine AS final/);
  });
});

describe('Dockerfile.backend', () => {
  const content = readFile('Dockerfile.backend');

  it('installs dependencies with --legacy-peer-deps', () => {
    expect(content).toMatch(/RUN npm install --legacy-peer-deps/);
  });

  it('does not remove lockfiles (unlike the frontend Dockerfiles)', () => {
    expect(content).not.toMatch(/rm -f package-lock\.json/);
  });
});

describe('Dockerfile.frontend', () => {
  const content = readFile('Dockerfile.frontend');

  it('builds from a slim base image instead of alpine', () => {
    expect(content).toMatch(/FROM node:22-slim AS builder/);
    expect(content).not.toMatch(/FROM node:22-alpine AS builder/);
  });

  it('removes committed lockfiles before installing with --legacy-peer-deps', () => {
    expect(content).toMatch(
      /RUN rm -f package-lock\.json frontend\/package-lock\.json && npm install --legacy-peer-deps/,
    );
  });

  it('still uses the alpine image for the runner stage', () => {
    expect(content).toMatch(/FROM node:22-alpine AS runner/);
  });
});