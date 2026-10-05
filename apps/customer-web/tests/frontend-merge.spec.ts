import { expect, test } from './offline-test';
import { apiUrl, installFixtures } from './fixtures';

// All API traffic is intercepted; installFixtures blocks non-local unhandled requests.
test('public opaque reference respects backend UNAVAILABLE without disclosing identity', async ({ page }) => {
  const fixture = await installFixtures(page);
  let lookups = 0;
  await page.route(apiUrl + '/verify/rhc-id/opaque-unavailable-reference', (route) => {
    lookups += 1;
    expect(route.request().headers().authorization).toBeUndefined();
    return route.fulfill({ json: { success: true, data: {
      valid: false, status: 'UNAVAILABLE', message: 'Protected public sharing is not configured.',
      rhc_id: 'SHOULD-NOT-DISCLOSE', display_name: 'SHOULD-NOT-DISCLOSE',
    } } });
  });
  await page.goto('/verify/rhc-id/opaque-unavailable-reference');
  await expect(page.getByRole('heading', { name: 'Public Verification Unavailable', exact: true })).toBeVisible();
  await expect(page.getByText('Protected public sharing is not configured.')).toBeVisible();
  await expect(page.getByText('SHOULD-NOT-DISCLOSE')).toHaveCount(0);
  await expect(page.getByText('API verification', { exact: true })).toBeVisible();
  // Initial auth settlement invalidates the request scope and may restart this anonymous GET.
  expect(lookups).toBeGreaterThanOrEqual(1);
  expect(fixture.requests.filter((request) => request.path === '/auth/session')).toHaveLength(0);
});

test('public lookup failure cannot become a valid synthetic identity', async ({ page }) => {
  await installFixtures(page);
  await page.route(apiUrl + '/verify/rhc-id/opaque-failing-reference', (route) => route.fulfill({
    status: 503, json: { message: 'Offline verification failure' },
  }));
  await page.goto('/verify/rhc-id/opaque-failing-reference');
  await expect(page.getByRole('alert').filter({ hasText: 'Offline verification failure' })).toBeVisible();
  await expect(page.getByText('VALID', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Masked holder', { exact: true })).toHaveCount(0);
});
