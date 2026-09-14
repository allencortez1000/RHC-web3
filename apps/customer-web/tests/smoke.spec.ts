import { test, expect } from '@playwright/test';
import { apiUrl, authUrl, installFixtures, signIn, token } from './fixtures';

test('anonymous deep links never expose account data', async ({ page }) => {
  const fixture = await installFixtures(page);
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  expect(fixture.requests).toHaveLength(0);
});

test('login, bearer session, reload, profile update, and real logout', async ({ page }) => {
  const fixture = await installFixtures(page);
  await signIn(page);
  await expect(page.getByText('Alex Rivera').first()).toBeVisible();
  await expect(page.getByText('12,850')).toHaveCount(0);
  await page.goto('/profile');
  await page.getByLabel('First name', { exact: true }).fill('Alexandra');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Profile saved.' })).toBeVisible();
  expect(
    fixture.requests.find((item) => item.method === 'PATCH' && item.path === '/me')?.body,
  ).toMatchObject({ first_name: 'Alexandra', last_name: 'Rivera' });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Alexandra Rivera' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login$/);
  expect(fixture.authRequests.some((item) => item.path === '/logout')).toBe(true);
  expect(fixture.requests.every((item) => item.authorization === `Bearer ${token}`)).toBe(true);
});

test('registration validates passwords and requests an email confirmation', async ({ page }) => {
  const fixture = await installFixtures(page);
  await page.goto('/register');
  await page.getByLabel('Email address').fill('new@example.test');
  await page.getByLabel('Mobile number').fill('+639123456789');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-42!');
  await page.getByLabel('Confirm password').fill('Different-password-42!');
  await page.getByLabel('I accept').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Passwords do not match' })).toBeVisible();
  expect(fixture.authRequests.filter((item) => item.path === '/signup')).toHaveLength(0);
  await page.getByLabel('Confirm password').fill('Synthetic-password-42!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('status')).toContainText('Check your email');
  expect(fixture.authRequests.find((item) => item.path === '/signup')?.body).toMatchObject({
    email: 'new@example.test',
    data: { mobile_number: '+639123456789', privacy_terms_acceptance: true },
  });
  expect(fixture.requests).toEqual([{ method: 'GET', path: '/auth/config', body: null, authorization: undefined }]);
});

test('invalid credentials stay on login with an actionable error', async ({ page }) => {
  const fixture = await installFixtures(page, { loginError: true });
  await page.goto('/login');
  await page.getByLabel('Email address').fill('alex@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Wrong-password-42!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Invalid login credentials' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(fixture.requests).toHaveLength(0);
});


test('revoked refresh tokens do not reach protected API endpoints', async ({ page }) => {
  const fixture = await installFixtures(page, { expired: true });
  await page.route(`${authUrl}/auth/v1/token**`, (route) =>
    route.fulfill({
      status: 400,
      json: { code: 'refresh_token_not_found', msg: 'Refresh token not found' },
    }),
  );
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login$/);
  expect(fixture.requests).toHaveLength(0);
});

test('expired persisted sessions refresh before sending API bearer', async ({ page }) => {
  const fixture = await installFixtures(page, { expired: true });
  await page.goto('/notifications');
  await expect(page.getByRole('heading', { name: 'Profile review complete' })).toBeVisible();
  expect(
    fixture.authRequests.some(
      (item) => item.path === '/token' && item.body?.refresh_token === 'fixture-refresh-token',
    ),
  ).toBe(true);
});

test('ID reads do not issue IDs; explicit issue action does', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true, businessVerified: true });
  fixture.profile.rhc_id = null;
  await page.goto('/digital-id');
  await expect(page.getByRole('button', { name: 'Issue RHC ID' })).toBeVisible();
  expect(
    fixture.requests.filter((item) => item.path === '/me/rhc-id' && item.method === 'POST'),
  ).toHaveLength(0);
  await page.getByRole('button', { name: 'Issue RHC ID' }).click();
  await expect(page.getByText('RHC-2026-00000042').first()).toBeVisible();
  expect(
    fixture.requests.filter((item) => item.path === '/me/rhc-id' && item.method === 'POST'),
  ).toHaveLength(1);
});

test('confirmed email leaves a new account pending review until refreshed API approval', async ({
  page,
}) => {
  const fixture = await installFixtures(page, { authenticated: true });
  await page.goto('/digital-id');
  await expect(
    page.getByRole('heading', { name: 'Email and business verification' }),
  ).toBeVisible();
  await expect(
    page.getByText('Confirming your email does not approve business verification.', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Issue RHC ID' })).toBeDisabled();
  expect(fixture.account.auth_email_confirmed_at).toBeTruthy();
  expect(fixture.account.verification_status).toBe('PENDING');
  expect(fixture.requests.filter((item) => item.method === 'POST')).toHaveLength(0);
  fixture.account.verification_status = 'VERIFIED';
  await page.getByRole('button', { name: 'Refresh eligibility' }).click();
  await expect(page.getByRole('button', { name: 'Issue RHC ID' })).toBeEnabled();
  expect(fixture.requests.filter((item) => item.method === 'POST')).toHaveLength(0);
  await page.goto('/profile');
  await expect(
    page.getByRole('heading', { name: 'Email and business verification' }),
  ).toBeVisible();
});

for (const [reason, patch] of [
  ['unverified business status', { verification_status: 'UNVERIFIED' }],
  ['rejected business status', { verification_status: 'REJECTED' }],
  ['pending account', { account_status: 'PENDING' }],
  ['unconfirmed email', { auth_email_confirmed_at: null }],
  ['missing confirmation field', { auth_email_confirmed_at: undefined }],
  ['future confirmation', { auth_email_confirmed_at: '2099-01-01T00:00:00.000Z' }],
  ['invalid confirmation', { auth_email_confirmed_at: 'not-a-timestamp' }],
] as const) {
  test(`ID issuance stays disabled for ${reason}`, async ({ page }) => {
    const fixture = await installFixtures(page, { authenticated: true, businessVerified: true });
    fixture.profile.rhc_id = null;
    Object.assign(fixture.account, patch);
    await page.goto('/digital-id');
    await expect(page.getByRole('button', { name: 'Issue RHC ID' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Issue RHC ID' })).not.toHaveAttribute(
      'title',
      'Coming soon — Month 2',
    );
    expect(
      fixture.requests.filter((item) => item.path === '/me/rhc-id' && item.method === 'POST'),
    ).toHaveLength(0);
  });
}

test('eligible ID requests still respect API feature and eligibility denial', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true, businessVerified: true });
  fixture.profile.rhc_id = null;
  await page.route(`${apiUrl}/me/rhc-id`, (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 403,
          json: { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        })
      : route.fallback(),
  );
  await page.goto('/digital-id');
  await expect(page.getByRole('button', { name: 'Issue RHC ID' })).toBeEnabled();
  await page.getByRole('button', { name: 'Issue RHC ID' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'You do not have permission' }),
  ).toBeVisible();
  await expect(page.getByText('RHC-2026-00000042')).toHaveCount(0);
  expect(fixture.profile.rhc_id).toBeNull();
});

test('property detail uses authorized sold records; directory and notifications are live', async ({
  page,
}) => {
  const fixture = await installFixtures(page, { authenticated: true });
  await page.goto('/properties');
  await expect(page.getByRole('heading', { name: 'FIX-1205' })).toBeVisible();
  await page.getByRole('link', { name: 'View Property' }).click();
  await expect(page.getByRole('heading', { name: 'FIX-1205' })).toBeVisible();
  await expect(page.getByText('SOLD', { exact: true })).toBeVisible();
  expect(fixture.requests.some((item) => item.path.startsWith('/properties/'))).toBe(false);
  await page.goto('/marketplace');
  await expect(page.getByRole('heading', { name: 'Fixture Resident Services' })).toBeVisible();
  await page.getByRole('button', { name: 'RHC Businesses', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fixture Company' })).toBeVisible();
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fixture Tower' })).toBeVisible();
});

test('loading failures are retryable and empty data never becomes demo data', async ({ page }) => {
  await installFixtures(page, {
    authenticated: true,
    empty: true,
    failOnce: ['/me/notifications'],
  });
  await page.goto('/notifications');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Service temporarily unavailable' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No notifications' })).toBeVisible();
  await page.goto('/properties');
  await expect(page.getByRole('heading', { name: 'No linked properties' })).toBeVisible();
  await expect(page.getByText('Juan Dela Cruz')).toHaveCount(0);
});

test('session rejection hides previously authenticated content', async ({ page }) => {
  await installFixtures(page, { authenticated: true });
  await page.route(`${apiUrl}/auth/session`, (route) =>
    route.fulfill({
      status: 401,
      json: { success: false, error: { message: 'Authentication required' } },
    }),
  );
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Account access' })).toBeVisible();
  await expect(page.getByLabel('First name', { exact: true })).toHaveCount(0);
});

test('token assets, themes, disabled actions and mobile sign-out retain the UI', async ({
  page,
}) => {
  await installFixtures(page, { authenticated: true });
  await page.goto('/token');
  await expect(page.getByRole('button', { name: /RHC Token 3D coin/ })).toBeVisible();
  await expect(page.locator('img[src="/images/rhc-token-front.png"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeDisabled();
  const before = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: 'Toggle light and dark theme' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', before!);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).last().click();
  await expect(page).toHaveURL(/\/login$/);
});
