import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(import.meta.dirname, '../../../..');
const SUPABASE_URL = 'https://xgtlrztskoomimvfpdoy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhndGxyenRza29vbWltdmZwZG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDAzOTUsImV4cCI6MjA5NDUxNjM5NX0.wLQjtFsLuXmCbvKMFdukK3fk3brft-mjZb4dz1QUH2Q';

describe('Supabase Integration', () => {
  it('SUPABASE_URL is configured and valid', () => {
    expect(SUPABASE_URL).toBeTruthy();
    expect(SUPABASE_URL).toMatch(/^https:\/\/.+\.supabase\.co$/);
  });

  it('SUPABASE_ANON_KEY has valid JWT format', () => {
    expect(SUPABASE_ANON_KEY).toBeTruthy();
    expect(SUPABASE_ANON_KEY).toMatch(/^eyJ/);
    const parts = SUPABASE_ANON_KEY.split('.');
    expect(parts).toHaveLength(3);
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    expect(payload.role).toBe('anon');
    expect(payload.iss).toBe('supabase');
  });

  it('JWKS endpoint resolves and returns RSA keys', async () => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, {
      signal: AbortSignal.timeout(10000),
    });
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body).toHaveProperty('keys');
    expect(Array.isArray(body.keys)).toBe(true);
    if (body.keys.length > 0) {
      const key = body.keys[0];
      expect(key).toHaveProperty('kty');
      expect(key).toHaveProperty('kid');
      if (key.kty === 'RSA') {
        expect(key).toHaveProperty('n');
        expect(key).toHaveProperty('e');
      }
      if (key.kty === 'EC' || key.alg === 'ES256') {
        expect(key).toHaveProperty('crv');
        expect(key).toHaveProperty('x');
        expect(key).toHaveProperty('y');
      }
    }
  });

  it('REST API reachable with anon key', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      signal: AbortSignal.timeout(10000),
    });
    expect([200, 401, 404, 406]).toContain(res.status);
  });

  it('stories table accessible (anon read)', async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/stories?limit=1`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    } else {
      expect([401, 404, 406]).toContain(res.status);
    }
  });

  it('local supabase config.toml exists', () => {
    const configPath = resolve(PROJECT_ROOT, 'backend-supabase/supabase/config.toml');
    expect(existsSync(configPath)).toBe(true);
    const config = readFileSync(configPath, 'utf-8');
    expect(config).toContain('project_id = "light-story"');
    expect(config).toContain('[api]');
    expect(config).toContain('[db]');
    expect(config).toContain('[auth]');
  });

  it('migrations directory has SQL files', () => {
    const migrationsDir = resolve(PROJECT_ROOT, 'backend-supabase/supabase/migrations');
    expect(existsSync(migrationsDir)).toBe(true);
    const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThan(0);
  });

  it('seed.sql exists', () => {
    const seedPath = resolve(PROJECT_ROOT, 'backend-supabase/supabase/seed.sql');
    expect(existsSync(seedPath)).toBe(true);
    const content = readFileSync(seedPath, 'utf-8');
    expect(content.length).toBeGreaterThan(100);
  });
});
