import { describe, expect, it } from 'vitest';
import { corsHeaders, isOriginAllowed } from '../middleware/cors';

describe('isOriginAllowed', () => {
  it('allows the production origin', () => {
    expect(isOriginAllowed('https://lightstory.app')).toBe(true);
  });

  it('allows localhost during development', () => {
    expect(isOriginAllowed('http://localhost:3000')).toBe(true);
  });

  it('rejects an arbitrary vercel.app deployment', () => {
    expect(isOriginAllowed('https://totally-unrelated-attacker.vercel.app')).toBe(false);
  });

  it('allows a configured preview suffix', () => {
    expect(
      isOriginAllowed('https://light-story-git-main-acme.vercel.app', [
        'light-story-git-main-acme.vercel.app',
      ]),
    ).toBe(true);
  });

  it('rejects a suffix-confusion origin', () => {
    // evil-lightstory.app must not match a "lightstory.app" suffix rule.
    expect(isOriginAllowed('https://evil-lightstory.app', ['lightstory.app'])).toBe(false);
  });

  it('rejects a garbage origin', () => {
    expect(isOriginAllowed('not-a-url')).toBe(false);
  });
});

describe('corsHeaders', () => {
  it('never pairs a wildcard origin with credentials', () => {
    const h = corsHeaders('https://attacker.vercel.app');
    if (h['Access-Control-Allow-Origin'] === '*') {
      expect(h['Access-Control-Allow-Credentials']).toBe('false');
    }
  });
});
