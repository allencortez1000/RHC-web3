import { test, expect, type Page } from './offline-test';
import { apiUrl, installFixtures } from './fixtures';

// Actual Chromium rendering; ALL Auth/API replies are synthetic intercepts.
// These tests do not prove server authorization, DB isolation or connected UAT.
const panelSelector = '[data-rhc-points-policy="read-only-unavailable"]';
function observe(page: Page) {
  const sensitiveRequests: string[] = [];
  const providerRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (/\/me\/(?:demo-records|rewards|wallet)(?:\/|$)|\/web3\/token/.test(url.pathname)) {
      sensitiveRequests.push(`${request.method()} ${url.pathname}`);
    }
    if (/thirdweb|walletconnect|reown|infura/.test(url.hostname)) providerRequests.push(url.hostname);
  });
  page.on('pageerror', error => errors.push(error.message));
  return { sensitiveRequests, providerRequests, errors };
}
async function expectPassive(page: Page) {
  const panel = page.locator(panelSelector);
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-points-balance]')).toHaveText('Unavailable');
  await expect(panel.locator('[data-points-history]')).toHaveText('History unavailable');
  await expect(panel.getByRole('status')).toContainText('approved account-scoped Points service is not connected');
  const controls = panel.getByRole('button');
  await expect(controls).toHaveCount(3);
  for (const button of await controls.all()) await expect(button).toBeDisabled();
  await expect(panel.getByText('12,850', { exact: false })).toHaveCount(0);
  await expect(panel.getByText('0.00', { exact: false })).toHaveCount(0);
}
function expectNoPointsIo(observed: ReturnType<typeof observe>) {
  expect(observed.sensitiveRequests).toEqual([]);
  expect(observed.providerRequests).toEqual([]);
  expect(observed.errors).toEqual([]);
}

test('anonymous Points deep link retains the existing sign-in boundary', async ({ page }) => {
  const fixture = await installFixtures(page);
  const observed = observe(page);
  await page.goto('/rhc-points');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator(panelSelector)).toHaveCount(0);
  expect(fixture.requests).toHaveLength(0);
  expectNoPointsIo(observed);
});

for (const [name, width, height] of [['mobile', 375, 812], ['tablet', 768, 1024], ['desktop', 1440, 1000]] as const) {
  test(`read-only unavailable state renders on ${name} with zero Points/provider requests`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    const fixture = await installFixtures(page, { authenticated: true, businessVerified: true });
    const observed = observe(page);
    await page.goto('/rhc-points');
    await expectPassive(page);
    const geometry = await page.locator(panelSelector).boundingBox();
    expect(geometry).not.toBeNull();
    expect(geometry!.x).toBeGreaterThanOrEqual(-1);
    expect(geometry!.x + geometry!.width).toBeLessThanOrEqual(width + 1);
    expect(fixture.requests.filter(request => ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method))).toEqual([]);
    expectNoPointsIo(observed);
    await page.screenshot({ path: testInfo.outputPath(`points-readonly-${name}.png`), fullPage: true });
  });
}

for (const status of ['DISABLED', 'LOCKED']) {
  test(`${status} fixture account remains rejected without Points content`, async ({ page }) => {
    await installFixtures(page, { authenticated: true, accountStatus: status });
    const observed = observe(page);
    await page.goto('/rhc-points');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator(panelSelector)).toHaveCount(0);
    expectNoPointsIo(observed);
  });
}

test('business-pending fixture cannot obtain actionable rewards controls', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true });
  const observed = observe(page);
  await page.goto('/rhc-points');
  await expectPassive(page);
  expect(fixture.account.verification_status).toBe('PENDING');
  expectNoPointsIo(observed);
});

test('URL and caller storage values cannot enable actions or inject a balance', async ({ page }) => {
  await installFixtures(page, { authenticated: true, businessVerified: true });
  const observed = observe(page);
  await page.addInitScript(() => {
    localStorage.setItem('rhc-points', JSON.stringify({ balance: '999999.99', can_redeem: true }));
    sessionStorage.setItem('ENABLE_REWARDS', 'true');
  });
  await page.goto('/rhc-points?balance=999999.99&can_redeem=true&user_id=another-user');
  await expectPassive(page);
  await expect(page.locator(panelSelector)).not.toContainText('999999.99');
  expectNoPointsIo(observed);
});

test('legacy demo response is never requested even when a successful fixture is available', async ({ page }) => {
  await installFixtures(page, { authenticated: true, businessVerified: true });
  const observed = observe(page);
  let legacyCalls = 0;
  await page.route(`${apiUrl}/me/demo-records`, route => {
    legacyCalls += 1;
    return route.fulfill({ json: { success: true, data: { rewards: { balance: 999999.99, earned: 999999.99, redeemed: 0, entries: [] }, benefits: [{ id: 'fake', title: 'Injected offer', cost: 1 }] } } });
  });
  await page.goto('/rhc-points');
  await expectPassive(page);
  await page.reload();
  await expectPassive(page);
  expect(legacyCalls).toBe(0);
  await expect(page.locator(panelSelector)).not.toContainText('Injected offer');
  expectNoPointsIo(observed);
});

test('removing disabled in the DOM still finds no redemption click handler', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true, businessVerified: true });
  const observed = observe(page);
  const dialogs: string[] = [];
  page.on('dialog', dialog => { dialogs.push(dialog.type()); void dialog.dismiss(); });
  await page.goto('/rhc-points');
  await expectPassive(page);
  await page.locator(`${panelSelector} button`).evaluateAll(buttons => {
    for (const item of buttons) { const button = item as HTMLButtonElement; button.disabled = false; button.click(); }
  });
  await page.waitForTimeout(150);
  expect(dialogs).toEqual([]);
  expect(fixture.requests.filter(request => ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method))).toEqual([]);
  expectNoPointsIo(observed);
});

test('keyboard tab skips the disabled Points action controls', async ({ page }) => {
  await installFixtures(page, { authenticated: true });
  const observed = observe(page);
  await page.goto('/rhc-points');
  await expectPassive(page);
  await page.locator(panelSelector).evaluate(panel => {
    const before = document.createElement('button'); before.id = 'test-focus-before'; before.textContent = 'Before Points';
    const after = document.createElement('button'); after.id = 'test-focus-after'; after.textContent = 'After Points';
    panel.before(before); panel.after(after); before.focus();
  });
  await expect(page.locator('#test-focus-before')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#test-focus-after')).toBeFocused();
  expectNoPointsIo(observed);
});

test('sign-out and browser-back cannot restore protected Points content', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true });
  const observed = observe(page);
  // Seed real same-origin history rather than navigating Back to about:blank.
  await page.goto('/help');
  await expect(page).toHaveURL(/\/help$/);
  await page.goto('/rhc-points');
  await expectPassive(page);
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator(panelSelector)).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/help$/);
  await expect(page.locator(panelSelector)).toHaveCount(0);
  await page.goto('/rhc-points');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator(panelSelector)).toHaveCount(0);
  expect(fixture.authRequests.some(request => request.path === '/logout')).toBe(true);
  expectNoPointsIo(observed);
});

test('changed synthetic account context after reload still cannot fabricate Points data', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true, businessVerified: true });
  const observed = observe(page);
  await page.goto('/rhc-points');
  await expectPassive(page);
  fixture.account.id = '33333333-3333-4333-8333-333333333333';
  fixture.profile.first_name = 'Sam';
  fixture.profile.last_name = 'Morgan';
  await page.reload();
  await expectPassive(page);
  await expect(page.locator(panelSelector)).not.toContainText('Alex');
  await expect(page.locator(panelSelector)).not.toContainText('Sam');
  expectNoPointsIo(observed);
});