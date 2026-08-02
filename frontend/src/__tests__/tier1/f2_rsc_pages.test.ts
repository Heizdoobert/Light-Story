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

const EXPECTED_SERVER_PAGES = ['page.tsx', '(errors)/forbidden/page.tsx', '(errors)/unauthorized/page.tsx'];

const DENSE_PAGES: Record<string, number> = {
  '(admin)/admin/page.tsx': 28,
  '(main)/comics/[comicId]/add-chapter/page.tsx': 174,
  '(main)/story/[storyId]/page.tsx': 216,
  '(main)/story/[storyId]/chapter/[chapterId]/page.tsx': 124,
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

describe('F2 RSC page files under src/app', () => {
  it('contains exactly 18 page.tsx files', () => {
    expect(findPages().sort()).toHaveLength(18);
  });

  it('exports a default component from every page', () => {
    for (const p of findPages()) expect(readPage(p), p).toContain('export default');
  });

  it('keeps exactly 3 server pages (no client directive): home, forbidden, unauthorized', () => {
    const serverPages = findPages().filter((p) => !readPage(p).includes('use client'));
    expect(serverPages.sort()).toEqual([...EXPECTED_SERVER_PAGES].sort());
  });

  it('home page is an async RSC wrapper importing the HomePage client component', () => {
    const content = readPage('page.tsx');
    expect(content).toMatch(/export default async function/);
    expect(content).not.toContain('use client');
    expect(content).toContain('@/components/comics/HomePage');
  });

  it('forbidden and unauthorized pages redirect to the handled exception routes', () => {
    const forbidden = readPage('(errors)/forbidden/page.tsx');
    const unauthorized = readPage('(errors)/unauthorized/page.tsx');
    expect(forbidden).not.toContain('use client');
    expect(unauthorized).not.toContain('use client');
    expect(forbidden).toContain("redirect('/handle-exception/403')");
    expect(unauthorized).toContain("redirect('/handle-exception/401')");
  });

  it('marks all 15 remaining pages as client components', () => {
    const serverPages = new Set(EXPECTED_SERVER_PAGES);
    const clientPages = findPages().filter((p) => !serverPages.has(p));
    expect(clientPages).toHaveLength(15);
    for (const p of clientPages) {
      expect(readPage(p).includes('use client'), `${p} missing 'use client'`).toBe(true);
    }
  });

  it('keeps 4 dense pages and 11 thin wrappers (line-count hygiene)', () => {
    const byPath = new Map(findPages().map((p) => [p, countLines(readPage(p))]));
    for (const [p, expected] of Object.entries(DENSE_PAGES)) {
      expect(byPath.get(p), `line count of ${p}`).toBe(expected);
    }
    for (const p of Object.keys(THIN_WRAPPERS)) {
      expect(byPath.get(p)!, `${p} should be a thin wrapper`).toBeLessThanOrEqual(20);
    }
    expect(Object.keys(DENSE_PAGES).length + Object.keys(THIN_WRAPPERS).length + EXPECTED_SERVER_PAGES.length).toBe(18);
  });

  it('wraps dense feature pages in the admin route with a role guard', () => {
    const admin = readPage('(admin)/admin/page.tsx');
    expect(admin).toContain('RoleProtectedRoute');
    expect(admin).toContain('use client');
  });

  it('gives every thin wrapper exactly one component import from @/components', () => {
    for (const p of Object.keys(THIN_WRAPPERS)) {
      const imports = readPage(p).match(/from ['"]@\/components\/[^'"]+['"]/g) ?? [];
      expect(imports, `${p} should import exactly one component`).toHaveLength(1);
    }
  });

  it('renders the expected component in each thin wrapper', () => {
    for (const [p, component] of Object.entries(THIN_WRAPPERS)) {
      expect(readPage(p), `${p} should render ${component}`).toContain(component);
    }
  });
});
