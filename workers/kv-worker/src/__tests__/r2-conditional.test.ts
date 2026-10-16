import { describe, expect, it } from 'vitest';
import { classifyR2Get, conditionalGetOptions } from '../utils/r2-conditional';

describe('conditionalGetOptions', () => {
  it('returns no precondition when the client sent no If-None-Match', () => {
    expect(conditionalGetOptions(null)).toEqual({});
  });

  it('maps If-None-Match to etagDoesNotMatch, not etagMatches', () => {
    // etagMatches is If-Match. Using it here inverts the condition: R2 returns
    // a bodyless object exactly when the content HAS changed.
    expect(conditionalGetOptions('"abc"')).toEqual({
      onlyIf: { etagDoesNotMatch: '"abc"' },
    });
  });
});

describe('classifyR2Get', () => {
  it('reports a missing object', () => {
    expect(classifyR2Get(null)).toEqual({ kind: 'missing' });
  });

  it('reports not-modified when R2 returns an object with no body', () => {
    expect(classifyR2Get({ httpEtag: '"abc"' })).toEqual({
      kind: 'not-modified',
      etag: '"abc"',
    });
  });

  it('reports a body when R2 returns one', () => {
    expect(classifyR2Get({ body: {}, httpEtag: '"abc"' })).toEqual({ kind: 'body' });
  });

  it('does not treat a missing object as not-modified', () => {
    // The old code returned 304 for a missing key whenever If-None-Match was
    // present, teaching clients to cache nonexistence.
    expect(classifyR2Get(null).kind).not.toBe('not-modified');
  });
});
