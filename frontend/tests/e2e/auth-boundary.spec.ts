import { test, expect } from '@playwright/test';

test.describe('Authentication & Authorization Boundary Tests', () => {
  test('unauthenticated users should be blocked or redirected from /admin', async ({ page }) => {
    const response = await page.goto('/admin');
    const currentUrl = page.url();
    const isProtected =
      currentUrl.includes('/auth/login') ||
      currentUrl.includes('/unauthorized') ||
      currentUrl.includes('/forbidden') ||
      (response !== null && [401, 403, 307, 308].includes(response.status()));
    expect(isProtected).toBe(true);
  });

  test('unauthenticated users should be blocked or redirected from /admin/dashboard', async ({ page }) => {
    const response = await page.goto('/admin/dashboard');
    const currentUrl = page.url();
    const isProtected =
      currentUrl.includes('/auth/login') ||
      currentUrl.includes('/unauthorized') ||
      currentUrl.includes('/forbidden') ||
      (response !== null && [401, 403, 307, 308].includes(response.status()));
    expect(isProtected).toBe(true);
  });
});
