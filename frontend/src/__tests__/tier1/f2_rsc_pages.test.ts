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

const EXPECTED_SERVER_PAGES = [
  '(admin)/admin/page.tsx',
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
];

const THIN_WRAPPERS: Record<string, string> = {
  '(public)/auth/reset-password/page.tsx': 'ResetPasswordPage',
  '(errors)/handle-exception/400/page.tsx': 'BadRequestPage',
  '(errors)/handle-exception/401/page.tsx': 'UnauthorizedPage',
  '(errors)/handle-exception/403/page.tsx': 'ForbiddenPage',
  '(errors)/handle-exception/404/page.tsx': 'NotFoundPage',
  '(errors)/handle-exception/503/page.tsx': 'ServiceUnavailablePage',
};

describe('F2 RSC page files under src/app', () => {
  it('contains page.tsx files across app route groups', () => {
    expect(findPages().length).toBeGreaterThanOrEqual(18);
  });

  it('exports a default component from every page', () => {
    for (const p of findPages()) expect(readPage(p), p).toContain('export default');
  });

  it('keeps server pages (no client directive)', () => {
    const serverPages = findPages().filter((p) => !readPage(p).includes('use client'));
    expect(serverPages.sort()).toEqual([...EXPECTED_SERVER_PAGES].sort());
  });

  it('home page is an async RSC wrapper importing the HomePage client component', () => {
    const content = readPage('(public)/page.tsx');
    expect(content).toMatch(/export default async function/);
    expect(content).not.toContain('use client');
    expect(content).toContain('@/components/comics/HomePage');
  });

  it('forbidden and unauthorized pages redirect to the handled exception routes', () => {
    const forbidden = readPage('(errors)/forbidden/page.tsx');
    const unauthorized = readPage('(errors)/unauthorized/page.tsx');
    expect(forbidden).not.toContain('use client');
    expect(unauthorized).not.toContain('use client');
    expect(forbidden).toContain('redirect(ROUTES.ERROR.FORBIDDEN)');
    expect(unauthorized).toContain('redirect(ROUTES.ERROR.UNAUTHORIZED)');
  });

  it('marks remaining interactive pages as client components', () => {
    const serverPages = new Set(EXPECTED_SERVER_PAGES);
    const clientPages = findPages().filter((p) => !serverPages.has(p));
    for (const p of clientPages) {
      expect(readPage(p).includes('use client'), `${p} missing 'use client'`).toBe(true);
    }
  });

  it('redirects the legacy /admin page to the dashboard route without a client directive', () => {
    const admin = readPage('(admin)/admin/page.tsx');
    expect(admin).not.toContain('use client');
    expect(admin).toContain('redirect(ROUTES.ADMIN.DASHBOARD)');
  });

  it('gives thin wrappers component imports from @/components', () => {
    for (const p of Object.keys(THIN_WRAPPERS)) {
      const imports = readPage(p).match(/from ['"]@\/components\/[^'"]+['"]/g) ?? [];
      expect(imports, `${p} should import component`).toHaveLength(1);
    }
  });

  it('renders the expected component in each thin wrapper', () => {
    for (const [p, component] of Object.entries(THIN_WRAPPERS)) {
      expect(readPage(p), `${p} should render ${component}`).toContain(component);
    }
  });
});
