import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const APP_DIR = join(__dirname, '..', '..', 'app');

const readPage = (rel: string): string =>
  readFileSync(join(APP_DIR, ...rel.split('/')), 'utf-8').replace(/^\uFEFF/, '');

const countLines = (content: string): number => {
  const lines = content.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  return lines.length;
};

const findPages = (): string[] => {
  const fs = require('fs');
  const path = require('path');
  const results: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (entry === 'page.tsx') results.push(path.relative(APP_DIR, full).replace(/\\/g, '/'));
    }
  };
  walk(APP_DIR);
  return results;
};

const SERVER_PAGES = ['page.tsx', '(errors)/forbidden/page.tsx', '(errors)/unauthorized/page.tsx'];

// Blank-inclusive line counts (match tier1; Measure-Object -Line skips blank lines).
const DENSE_PAGES: Record<string, number> = {
  '(main)/story/[storyId]/page.tsx': 216,
  '(main)/comics/[comicId]/add-chapter/page.tsx': 174,
  '(main)/story/[storyId]/chapter/[chapterId]/page.tsx': 124,
  '(admin)/admin/page.tsx': 28,
};

const THIN_WRAPPERS: Record<string, string> = {
  '(auth)/auth/reset-password/page.tsx': 'ResetPasswordPage',
  '(errors)/handle-exception/400/page.tsx': 'BadRequestPage',
  '(errors)/handle-exception/401/page.tsx': 'UnauthorizedPage',
  '(errors)/handle-exception/403/page.tsx': 'ForbiddenPage',
  '(errors)/handle-exception/404/page.tsx': 'NotFoundPage',
  '(errors)/handle-exception/503/page.tsx': 'ServiceUnavailablePage',
  '(main)/comics/[comicId]/page.tsx': 'ComicDetailPageContent',
  '(main)/comics/[comicId]/chapter/[chapterId]/page.tsx': 'ChapterReaderPageContent',
  '(main)/comics/create/page.tsx': 'CreateComicForm',
  '(main)/profile/page.tsx': 'ProfilePageContent',
  '(main)/search/page.tsx': 'SearchPageContent',
};

describe('F2 boundary: RSC page files under src/app', () => {
  it('still contains exactly 18 page.tsx files', () => {
    expect(findPages().sort()).toHaveLength(18);
  });

  it('gives every page exactly one default export (no stray extras)', () => {
    for (const p of findPages()) {
      const matches = readPage(p).match(/export default/g) ?? [];
      expect(matches, `${p} should have exactly one default export`).toHaveLength(1);
    }
  });

  it('never mixes the "use client" directive with an async default export', () => {
    for (const p of findPages()) {
      const content = readPage(p);
      const isClient = content.includes('use client');
      const isAsyncRSC = /export default async function/.test(content);
      expect(isClient && isAsyncRSC, `${p} mixes use client with an async RSC export`).toBe(false);
    }
  });

  it('keeps the 4 dense pages at their measured line counts', () => {
    const byPath = new Map(findPages().map((p) => [p, countLines(readPage(p))]));
    for (const [p, expected] of Object.entries(DENSE_PAGES)) {
      expect(byPath.get(p), `line count of ${p}`).toBe(expected);
    }
  });

  it('keeps every thin wrapper at 20 lines or fewer (search is the heaviest at 18)', () => {
    const byPath = new Map(findPages().map((p) => [p, countLines(readPage(p))]));
    for (const p of Object.keys(THIN_WRAPPERS)) {
      expect(byPath.get(p)!, `${p} should stay a thin wrapper`).toBeLessThanOrEqual(20);
    }
    expect(byPath.get('(main)/search/page.tsx')).toBe(18);
  });

  it('keeps exactly 3 server pages, and they are the only 5-line pages', () => {
    const serverPages = findPages().filter((p) => !readPage(p).includes('use client'));
    expect(serverPages.sort()).toEqual([...SERVER_PAGES].sort());
    const byPath = new Map(findPages().map((p) => [p, countLines(readPage(p))]));
    const fiveLinePages = findPages().filter((p) => byPath.get(p) === 5);
    expect(fiveLinePages.sort()).toEqual([...SERVER_PAGES].sort());
  });

  it('gives every thin wrapper exactly one component import that renders its expected component', () => {
    for (const [p, component] of Object.entries(THIN_WRAPPERS)) {
      const imports = readPage(p).match(/from ['"]@\/components\/[^'"]+['"]/g) ?? [];
      expect(imports, `${p} should import exactly one component`).toHaveLength(1);
      expect(readPage(p), `${p} should render ${component}`).toContain(component);
    }
  });
});
