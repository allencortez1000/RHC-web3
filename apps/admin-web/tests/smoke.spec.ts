import { test, expect } from '@playwright/test';
test('admin command center renders modules', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('RHC Command Center')).toBeVisible();
  await expect(page.getByText('Audit Logs')).toBeVisible();
});
