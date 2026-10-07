import { expect, test, type Page } from './offline-test';
import { apiUrl, installFixtures } from './fixtures';

function metric(page: Page, label: string) {
  return page.locator('.rhc-card').filter({ has: page.locator('.rhc-metric-label').filter({ hasText: new RegExp('^' + label + '$') }) }).locator('.rhc-value');
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) await page.screenshot({ path: info.outputPath('synthetic-failure.png'), fullPage: true });
});

test('API public shell does not label returned verification data as demonstration', async ({ page }) => {
  await installFixtures(page);
  await page.route(apiUrl + '/verify/rhc-id/opaque-review-reference', (route) => route.fulfill({ json: { success: true, data: { valid: false, status: 'UNAVAILABLE' } } }));
  await page.goto('/verify/rhc-id/opaque-review-reference');
  await expect(page.getByText('API verification', { exact: true })).toBeVisible();
  await expect(page.getByRole('note', { name: 'Demonstration environment' })).toHaveCount(0);
  await expect(page.getByRole('note', { name: 'API data mode' })).toBeVisible();
  await expect(page.getByText('Rabino Holdings Corporation · RHC public demonstration', { exact: true })).toHaveCount(0);
});

test('API verification entry offers no synthetic examples and keeps opaque lookup', async ({ page }) => {
  await installFixtures(page, { authenticated: true });
  await page.goto('/rhc-verify');
  const input = page.getByRole('textbox', { name: 'Opaque reference or verification URL' });
  await expect(input).toBeVisible();
  await expect(page.locator('a[href*=demo-passport]')).toHaveCount(0);
  await expect(input).not.toHaveAttribute('placeholder', /demo/);
  await input.fill('person@example.test');
  await page.getByRole('button', { name: 'Check credential' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'cannot be searched' })).toBeVisible();
  await page.route(apiUrl + '/verify/rhc-id/opaque-review-reference', (route) => route.fulfill({ json: { success: true, data: { valid: false, status: 'UNAVAILABLE' } } }));
  await input.fill('opaque-review-reference');
  await page.getByRole('button', { name: 'Check credential' }).click();
  await expect(page.getByRole('heading', { name: 'Public Verification Unavailable', exact: true })).toBeVisible();
});

test('API dashboard copy does not call connected records fictional', async ({ page }) => {
  await installFixtures(page, { authenticated: true });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'My RHC Dashboard', exact: true })).toBeVisible();
  await expect(page.locator('.rhc-dashboard-hero')).not.toContainText('Demo environment');
  await expect(page.getByText('Participating RHC businesses and services appear here as demo directory records.', { exact: false })).toHaveCount(0);
  await expect(metric(page, 'RHC Rewards')).toHaveText('Unavailable');
});
test('dashboard pending account and record reads never display zero or pending issuance', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true });
  const gate = deferred();
  let reads = 0;
  for (const path of ['/me', '/me/properties', '/me/reservations']) {
    await page.route(apiUrl + path, async (route) => { reads += 1; await gate.promise; await route.fulfill({ json: { success: true, data: path === '/me' ? { user: fixture.account, profile: null } : [] } }); });
  }
  try {
    await page.goto('/dashboard');
    await expect.poll(() => reads).toBeGreaterThanOrEqual(3);
    for (const label of ['RHC Digital ID', 'Linked properties', 'Active reservations']) await expect(metric(page, label)).toHaveText('Loading…');
  } finally { gate.resolve(); }
});

test('dashboard failed records and unsupported rewards are unavailable, not zero', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true, deny: ['/me', '/me/properties', '/me/reservations'] });
  await page.goto('/dashboard');
  await expect(page.getByRole('alert').filter({ hasText: 'Access denied' }).first()).toBeVisible();
  for (const label of ['RHC Digital ID', 'Linked properties', 'Active reservations', 'RHC Rewards']) await expect(metric(page, label)).toHaveText('Unavailable');
  expect(fixture.requests.some((request) => request.path === '/me/demo-records')).toBe(false);
});

test('successful empty customer records retain genuine zero and unissued ID', async ({ page }) => {
  await installFixtures(page, { authenticated: true, empty: true });
  await page.route(apiUrl + '/me/reservations', (route) => route.fulfill({ json: { success: true, data: [] } }));
  await page.goto('/dashboard');
  await expect(metric(page, 'Linked properties')).toHaveText('0');
  await expect(metric(page, 'Active reservations')).toHaveText('0');
  await expect(metric(page, 'RHC Digital ID')).toHaveText('Not issued');
  await expect(page.getByText('Explore the demo inventory to begin your property journey.', { exact: true })).toHaveCount(0);
});

test('empty account has explanatory journey stages, not inferred progress', async ({ page }) => {
  await installFixtures(page, { authenticated: true, empty: true });
  await page.goto('/dashboard');
  const journey = page.locator('.rhc-journey-timeline');
  await expect(journey).toBeVisible();
  await expect(journey.getByText('Active', { exact: true })).toHaveCount(0);
  await expect(journey.getByText('Workflow stage', { exact: true })).toHaveCount(6);
});

test('inventory distinguishes pending, failure and successful empty metrics', async ({ page }) => {
  await installFixtures(page, { authenticated: true, empty: true });
  const gate = deferred();
  let reads = 0;
  await page.route(apiUrl + '/properties?take=200', async (route) => {
    reads += 1;
    if (reads === 1) {
      await gate.promise;
      return route.fulfill({ status: 503, json: { success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Offline inventory failure' } } });
    }
    return route.fulfill({ json: { success: true, data: [] } });
  });
  try {
    await page.goto('/properties');
    await expect.poll(() => reads).toBe(1);
    for (const label of ['Matching records', 'Available units']) await expect(metric(page, label)).toHaveText('Loading…');
  } finally { gate.resolve(); }
  await expect(page.getByRole('alert').filter({ hasText: 'Offline inventory failure' })).toBeVisible();
  for (const label of ['Matching records', 'Available units']) await expect(metric(page, label)).toHaveText('Unavailable');
  await expect(page.getByText('0 held/reserved/contracted', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  for (const label of ['Matching records', 'Available units']) await expect(metric(page, label)).toHaveText('0');
  await expect(page.getByRole('heading', { name: 'No matching properties' })).toBeVisible();
});

test('loaded inventory remains countable and filtered empty is a real zero', async ({ page }) => {
  await installFixtures(page, { authenticated: true });
  await page.route(apiUrl + '/properties?take=200', (route) => route.fulfill({ json: { success: true, data: [
    { id: 'property-a', property_code: 'SYNTHETIC-A', asset_type: 'RESIDENTIAL', status: 'AVAILABLE' },
    { id: 'property-b', property_code: 'SYNTHETIC-B', asset_type: 'RESIDENTIAL', status: 'HELD' },
  ] } }));
  await page.goto('/properties');
  await expect(metric(page, 'Matching records')).toHaveText('2');
  await expect(metric(page, 'Available units')).toHaveText('1');
  await page.getByRole('textbox', { name: 'Search property inventory' }).fill('no-match');
  await expect(metric(page, 'Matching records')).toHaveText('0');
  await expect(metric(page, 'Available units')).toHaveText('0');
});

for (const width of [320, 375, 768, 1440]) {
  test('dashboard preserves responsive navigation and reduced-motion scrolling at ' + width, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await installFixtures(page, { authenticated: true, empty: true });
    await page.goto('/dashboard');
    await expect(metric(page, 'RHC Rewards')).toHaveText('Unavailable');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await skip.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
    if (width < 1024) {
      await expect(page.getByRole('navigation', { name: 'Mobile navigation', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign out', exact: true }).last()).toBeVisible();
    }
    if (width === 375) await page.screenshot({ path: info.outputPath('synthetic-mobile-dashboard.png'), fullPage: true });
  });
}

test('command menu retains keyboard containment and returns focus', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installFixtures(page, { authenticated: true });
  await page.goto('/dashboard');
  const trigger = page.getByRole('button', { name: 'Navigate' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Command menu' });
  await expect(dialog.getByRole('searchbox')).toBeFocused();
  const close = dialog.getByRole('button', { name: 'Close command menu' });
  const last = dialog.getByRole('link').last();
  await last.focus();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
