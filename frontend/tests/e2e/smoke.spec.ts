import { test, expect } from '@playwright/test';

test.describe('Public Smoke Tests', () => {
  test('homepage route should be accessible', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
  });

  test('comics listing page should be accessible', async ({ page }) => {
    const response = await page.goto('/comics');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
  });
});
