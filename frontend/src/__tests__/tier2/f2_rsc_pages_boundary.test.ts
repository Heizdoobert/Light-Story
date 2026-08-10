import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const APP_DIR = join(__dirname, '..', '..', 'app');

const readPage = (rel: string): string =>
  readFileSync(join(APP_DIR, ...rel.split('/')), 'utf-8').replace(/^\uFEFF/, '');

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

const SERVER_PAGES = [
  '(admin)/admin/page.tsx',
  '(admin)/admin/genres/page.tsx',
  '(admin)/admin/tags/page.tsx',
  '(errors)/forbidden/page.tsx',
  '(errors)/handle-exception/400/page.tsx',
  '(errors)/handle-exception/401/page.tsx',
  '(errors)/handle-exception/403/page.tsx',
  '(errors)/handle-exception/404/page.tsx',
  '(errors)/handle-exception/503/page.tsx',
  '(errors)/unauthorized/page.tsx',
  '(public)/auth/forgetPassword/page.tsx',
  '(public)/auth/login/page.tsx',
  '(public)/auth/register/page.tsx',
  '(public)/auth/reset-password/page.tsx',
  '(public)/comics/[comicId]/chapter/[chapterId]/page.tsx',
  '(public)/comics/[comicId]/page.tsx',
  '(public)/comics/page.tsx',
  '(public)/genres/[genreSlug]/page.tsx',
  '(public)/page.tsx',
  '(public)/profile/page.tsx',
  '(public)/search/page.tsx',
  '(user)/user/bookmarks/page.tsx',
  '(user)/user/history/page.tsx',
  '(user)/user/page.tsx',
  '(user)/user/profile/page.tsx',
];

const THIN_WRAPPERS: Record<string, string> = {
  '(public)/auth/reset-password/page.tsx': 'ResetPasswordPage',
  '(errors)/handle-exception/400/page.tsx': 'BadRequestPage',
  '(errors)/handle-exception/401/page.tsx': 'UnauthorizedPage',
  '(errors)/handle-exception/403/page.tsx': 'ForbiddenPage',
  '(errors)/handle-exception/404/page.tsx': 'NotFoundPage',
  '(errors)/handle-exception/503/page.tsx': 'ServiceUnavailablePage',
  '(user)/user/profile/page.tsx': 'ProfilePageContent',
};

describe('F2 boundary: RSC page files under src/app', () => {
  it('contains page.tsx files across app route groups', () => {
    expect(findPages().length).toBeGreaterThanOrEqual(18);
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

  it('keeps server pages clean of client directive', () => {
    const serverPages = findPages().filter((p) => !readPage(p).includes('use client'));
    expect(serverPages.sort()).toEqual([...SERVER_PAGES].sort());
  });

  it('gives every thin wrapper exactly one component import that renders its expected component', () => {
    for (const [p, component] of Object.entries(THIN_WRAPPERS)) {
      const imports = readPage(p).match(/from ['"]@\/components\/[^'"]+['"]/g) ?? [];
      expect(imports, `${p} should import exactly one component`).toHaveLength(1);
      expect(readPage(p), `${p} should render ${component}`).toContain(component);
    }
  });
});
