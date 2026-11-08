import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({
  WorkflowEntrypoint: class {},
  WorkflowEvent: class {},
  WorkflowStep: class {},
}));

import worker from '../src/index';

function createEnv(): Env {
  return {
    SUPABASE_URL: 'https://default.supabase.co',
    SUPABASE_URL_EU: 'https://eu.supabase.co',
    SUPABASE_URL_US: 'https://us.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon',
  } as unknown as Env;
}

const mockCtx: ExecutionContext = {
  waitUntil: () => {},
  passThroughOnException: () => {},
} as unknown as ExecutionContext;

describe('region-routing', () => {
  let env: Env;

  beforeEach(() => {
    env = createEnv();
    delete (globalThis as any).SUPABASE_URL;
  });

  it('selects SUPABASE_URL_EU when CF-Region header starts with EU', async () => {
    const req = new Request('http://localhost/api/health', {
      headers: { 'CF-Region': 'EU-WEST-1' },
    });

    await worker.fetch(req, env, mockCtx);
    expect((globalThis as any).SUPABASE_URL).toBe('https://eu.supabase.co');
  });

  it('selects SUPABASE_URL_US when CF-Region header starts with US', async () => {
    const req = new Request('http://localhost/api/health', {
      headers: { 'CF-Region': 'US-EAST-1' },
    });

    await worker.fetch(req, env, mockCtx);
    expect((globalThis as any).SUPABASE_URL).toBe('https://us.supabase.co');
  });

  it('falls back to default SUPABASE_URL when region is neither EU nor US', async () => {
    const req = new Request('http://localhost/api/health', {
      headers: { 'CF-Region': 'AP-SOUTHEAST-1' },
    });

    await worker.fetch(req, env, mockCtx);
    expect((globalThis as any).SUPABASE_URL).toBe('https://default.supabase.co');
  });

  it('falls back to default SUPABASE_URL when CF-Region header is missing', async () => {
    const req = new Request('http://localhost/api/health');

    await worker.fetch(req, env, mockCtx);
    expect((globalThis as any).SUPABASE_URL).toBe('https://default.supabase.co');
  });

  it('supports request.cf.region property', async () => {
    const req = new Request('http://localhost/api/health');
    (req as any).cf = { region: 'EU-CENTRAL' };

    await worker.fetch(req, env, mockCtx);
    expect((globalThis as any).SUPABASE_URL).toBe('https://eu.supabase.co');
  });
});
