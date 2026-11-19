import { test, expect, type Page } from '@playwright/test';

// Public routes that must render without a backend session.
const PUBLIC_ROUTES = ['/', '/comics', '/genres', '/search', '/auth/login', '/auth/register', '/auth/forgetPassword'];

// Console noise caused by the unreachable test backend, not by the UI itself.
const BACKEND_NOISE = /Failed to fetch|NetworkError|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|example\.supabase\.co|example\.workers\.dev|status of 5\d\d|status of 404/i;

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !BACKEND_NOISE.test(message.text())) {
      errors.push(`console: ${message.text().slice(0, 300)}`);
    }
  });
  return errors;
}

test.describe('UI quality on public routes', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} renders accessibly without client errors`, async ({ page }) => {
      const errors = collectErrors(page);
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), 'server status').toBeLessThan(500);
      await page.waitForLoadState('load');

      // Document basics
      await expect(page.locator('html')).toHaveAttribute('lang', /.+/);
      expect((await page.title()).trim().length, 'document title').toBeGreaterThan(0);

      // Every image has an alt attribute (empty alt is allowed for decorative images)
      const missingAlt = await page.locator('img:not([alt])').count();
      expect(missingAlt, 'images without alt').toBe(0);

      // Interactive controls have an accessible name
      const unnamed = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea'))
          .filter((el) => {
            const e = el as HTMLElement;
            if (e.offsetParent === null) return false; // not rendered
            const label =
              e.getAttribute('aria-label') ||
              e.getAttribute('aria-labelledby') ||
              e.getAttribute('title') ||
              (e as HTMLInputElement).placeholder ||
              (e.id && document.querySelector(`label[for="${CSS.escape(e.id)}"]`)?.textContent) ||
              e.closest('label')?.textContent ||
              e.textContent ||
              e.querySelector('img[alt]')?.getAttribute('alt');
            return !label || !label.trim();
          })
          .map((el) => el.outerHTML.slice(0, 160)),
      );
      expect(unnamed, 'controls without accessible name').toEqual([]);

      expect(errors, 'client errors').toEqual([]);
    });
  }

  test('home page has no horizontal overflow on a phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'load' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('responses carry security headers', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    const headers = response?.headers() ?? {};
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
});
