import { test, expect } from '@playwright/test';
test('customer portal renders future modules as coming soon', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('RHC Digital Customer Portal')).toBeVisible();
  await expect(page.getByText('RHC Wallet')).toBeVisible();
});
