import { describe, expect, it } from 'vitest';
import {
  assertUuid,
  uuidFilter,
  uuidInFilter,
  ValidationFailure,
} from '../utils/validation';

const A = '11111111-2222-3333-4444-555555555555';
const B = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('assertUuid', () => {
  it('returns the value for a well-formed uuid', () => {
    expect(assertUuid(A, 'id')).toBe(A);
  });

  it('throws ValidationFailure naming the field', () => {
    expect(() => assertUuid('not-a-uuid', 'comicId')).toThrow(ValidationFailure);
    try {
      assertUuid('not-a-uuid', 'comicId');
    } catch (e) {
      expect((e as ValidationFailure).field).toBe('comicId');
    }
  });

  it('rejects a PostgREST operator payload', () => {
    expect(() => assertUuid('neq.00000000-0000-0000-0000-000000000000', 'id')).toThrow(
      ValidationFailure,
    );
  });

  it('rejects non-strings', () => {
    expect(() => assertUuid(undefined, 'id')).toThrow(ValidationFailure);
    expect(() => assertUuid(null, 'id')).toThrow(ValidationFailure);
    expect(() => assertUuid(7, 'id')).toThrow(ValidationFailure);
  });
});

describe('uuidFilter', () => {
  it('builds an eq filter', () => {
    expect(uuidFilter('id', A)).toBe(`id=eq.${A}`);
  });

  it('refuses to build a filter from an injection payload', () => {
    expect(() => uuidFilter('id', 'neq.' + A)).toThrow(ValidationFailure);
  });
});

describe('uuidInFilter', () => {
  it('builds an in filter', () => {
    expect(uuidInFilter('id', [A, B])).toBe(`id=in.(${A},${B})`);
  });

  it('rejects an empty list', () => {
    expect(() => uuidInFilter('id', [])).toThrow(ValidationFailure);
  });

  it('rejects a non-array', () => {
    expect(() => uuidInFilter('id', A)).toThrow(ValidationFailure);
  });

  it('rejects a list containing one bad entry', () => {
    expect(() => uuidInFilter('id', [A, 'or=(1.eq.1)'])).toThrow(ValidationFailure);
  });
});
