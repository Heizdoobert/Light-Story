/**
 * Conditional-GET semantics for R2, in one place.
 *
 * R2's `onlyIf.etagMatches` is If-Match; `onlyIf.etagDoesNotMatch` is
 * If-None-Match. Getting this backwards makes R2 withhold the body exactly
 * when the content HAS changed, which surfaces as an empty 200 with a valid
 * content-length. Both the public /media route and the admin r2/file route had
 * that bug independently, so the rule lives here rather than at either caller.
 */

export interface R2ObjectLike {
  body?: unknown;
  httpEtag?: string;
}

export type R2GetOutcome =
  | { kind: 'missing' }
  | { kind: 'not-modified'; etag: string }
  | { kind: 'body' };

export function conditionalGetOptions(ifNoneMatch: string | null): R2GetOptions {
  if (!ifNoneMatch) return {};
  return { onlyIf: { etagDoesNotMatch: ifNoneMatch } };
}

export function classifyR2Get(object: R2ObjectLike | null): R2GetOutcome {
  if (!object) return { kind: 'missing' };
  if (!object.body) return { kind: 'not-modified', etag: object.httpEtag ?? '' };
  return { kind: 'body' };
}
