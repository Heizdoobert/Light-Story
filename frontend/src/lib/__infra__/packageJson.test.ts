import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_PACKAGE_JSON = path.resolve(__dirname, '../../../../package.json');
const FRONTEND_PACKAGE_JSON = path.resolve(__dirname, '../../../package.json');

function readJson(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

describe('root package.json', () => {
  const pkg = readJson(ROOT_PACKAGE_JSON);

  it('is valid, parseable JSON', () => {
    expect(pkg).toBeTypeOf('object');
  });

  it('pins wrangler to an exact version (no caret range)', () => {
    const devDeps = pkg.devDependencies as Record<string, string>;
    expect(devDeps.wrangler).toBe('4.105.0');
    expect(devDeps.wrangler.startsWith('^')).toBe(false);
  });

  it('does not use a "**" wildcard override key', () => {
    const overrides = pkg.overrides as Record<string, unknown>;
    expect(overrides).not.toHaveProperty('**');
  });

  it('scopes the postcss/sharp override to the "next" dependency', () => {
    const overrides = pkg.overrides as Record<string, unknown>;
    expect(overrides.next).toEqual({
      postcss: '8.5.22',
      sharp: '0.35.3',
    });
  });

  it('scopes the @hono/node-server override to @modelcontextprotocol/sdk', () => {
    const overrides = pkg.overrides as Record<string, unknown>;
    expect(overrides['@modelcontextprotocol/sdk']).toEqual({
      '@hono/node-server': '2.0.11',
    });
  });

  it('retains the top-level pinned overrides', () => {
    const overrides = pkg.overrides as Record<string, unknown>;
    expect(overrides['shell-quote']).toBe('1.10.0');
    expect(overrides['fast-uri']).toBe('4.1.1');
    expect(overrides['body-parser']).toBe('2.3.0');
    expect(overrides.postcss).toBe('8.5.22');
    expect(overrides.sharp).toBe('0.35.3');
    expect(overrides['@hono/node-server']).toBe('2.0.11');
  });
});

describe('frontend package.json', () => {
  const pkg = readJson(FRONTEND_PACKAGE_JSON);

  it('is valid, parseable JSON', () => {
    expect(pkg).toBeTypeOf('object');
  });

  it('declares react-is as a dependency', () => {
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps['react-is']).toBe('^19.2.8');
  });

  it('declares platform-specific lightningcss optional dependencies', () => {
    const optionalDeps = pkg.optionalDependencies as Record<string, string>;
    expect(optionalDeps).toBeDefined();
    expect(optionalDeps['lightningcss-linux-x64-gnu']).toBe('^1.29.1');
    expect(optionalDeps['lightningcss-linux-x64-musl']).toBe('^1.29.1');
  });

  it('does not use a "**" wildcard override key', () => {
    const overrides = pkg.overrides as Record<string, unknown>;
    expect(overrides).not.toHaveProperty('**');
  });

  it('scopes the postcss/sharp override to the "next" dependency', () => {
    const overrides = pkg.overrides as Record<string, unknown>;
    expect(overrides.next).toEqual({
      postcss: '8.5.22',
      sharp: '0.35.3',
    });
  });

  it('scopes the @hono/node-server override to @modelcontextprotocol/sdk', () => {
    const overrides = pkg.overrides as Record<string, unknown>;
    expect(overrides['@modelcontextprotocol/sdk']).toEqual({
      '@hono/node-server': '2.0.11',
    });
  });

  it('mirrors the same top-level pinned overrides as the root package.json', () => {
    const rootPkg = readJson(ROOT_PACKAGE_JSON);
    expect(pkg.overrides).toEqual(rootPkg.overrides);
  });
});