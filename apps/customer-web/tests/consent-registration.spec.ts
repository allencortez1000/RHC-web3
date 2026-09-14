import { test, expect, type Page } from '@playwright/test';
import { apiUrl, installFixtures, token } from './fixtures';

async function fillRegistration(page: Page) {
  await page.goto('/register');
  await page.getByLabel('Email address').fill('new@example.test');
  await page.getByLabel('Mobile number').fill('+639123456789');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-password-42!');
  await page.getByLabel('Confirm password').fill('Synthetic-password-42!');
  await page.getByLabel('I accept').check();
}

test('disabled registration never calls Supabase signup', async ({ page }) => {
  const fixture = await installFixtures(page, { registrationEnabled: false });
  await fillRegistration(page);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Registration is currently disabled' })).toBeVisible();
  expect(fixture.authRequests.some((item) => item.path === '/signup')).toBe(false);
  expect(fixture.requests).toEqual([{ method: 'GET', path: '/auth/config', body: null, authorization: undefined }]);
});

test('registration config failure is fail-closed and can be retried', async ({ page }) => {
  const fixture = await installFixtures(page, { failOnce: ['/auth/config'] });
  await fillRegistration(page);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Registration availability could not be checked' })).toBeVisible();
  expect(fixture.authRequests.some((item) => item.path === '/signup')).toBe(false);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('status')).toContainText('Check your email');
  expect(fixture.requests.filter((item) => item.path === '/auth/config')).toHaveLength(2);
  expect(fixture.authRequests.filter((item) => item.path === '/signup')).toHaveLength(1);
});

test('malformed public config cannot enable registration', async ({ page }) => {
  const fixture = await installFixtures(page);
  await page.route(`${apiUrl}/auth/config`, (route) => route.fulfill({ json: { success: true, data: { registration_enabled: 'true' } } }));
  await fillRegistration(page);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Registration availability could not be checked' })).toBeVisible();
  expect(fixture.authRequests.some((item) => item.path === '/signup')).toBe(false);
});

const policies = [
  { consent_type: 'PRIVACY_POLICY', purpose: 'ACCOUNT_PRIVACY', required: true, company_required: false },
  { consent_type: 'TERMS', purpose: 'ACCOUNT_TERMS', required: true, company_required: false },
  { consent_type: 'MARKETING', purpose: 'MARKETING_COMMUNICATIONS', required: false, company_required: false },
  { consent_type: 'DATA_SHARING', purpose: 'COMPANY_DATA_SHARING', required: false, company_required: true },
  { consent_type: 'COMPANY_SERVICE', purpose: 'COMPANY_SERVICE_DELIVERY', required: false, company_required: true },
].map((policy) => ({ ...policy, description: `Fixture purpose: ${policy.purpose}` }));
async function privacyFixture(page: Page) {
  const fixture = await installFixtures(page, { authenticated: true });
  const records: Array<Record<string, unknown>> = [];
  const writes: Array<Record<string, unknown>> = [];
  const controls = { failWrite: false, failRead: false };
  await page.route(`${apiUrl}/me/consents**`, async (route) => {
    const req = route.request();
    expect(req.headers().authorization).toBe(`Bearer ${token}`);
    if ((controls.failWrite && req.method() === 'POST') || (controls.failRead && req.method() === 'GET')) {
      controls.failWrite = false; controls.failRead = false;
      return route.fulfill({ status: 503, json: { success: false, error: { message: 'Consent service temporarily unavailable' } } });
    }
    if (req.method() === 'POST') {
      const body = req.postDataJSON();
      writes.push(body);
      const now = new Date().toISOString();
      const record = { ...body, id: `consent-${records.length + 1}`, created_at: now, granted_at: body.granted ? now : null, withdrawn_at: body.granted ? null : now, company: body.company_id ? fixture.company : null };
      records.unshift(record);
      return route.fulfill({ status: 201, json: { success: true, data: record } });
    }
    const skip = Number(new URL(req.url()).searchParams.get('skip') || 0);
    return route.fulfill({ json: { success: true, data: { policies, records: records.slice(skip, skip + 20) } } });
  });
  return { ...fixture, records, writes, controls };
}

test('account consent is explicit, versioned, and separate from optional permissions', async ({ page }) => {
  const fixture = await privacyFixture(page);
  await page.goto('/security');
  await expect(page.getByText('No consent decisions recorded.')).toBeVisible();
  const account = page.locator('form').filter({ has: page.getByRole('combobox', { name: 'Account policy', exact: true }) });
  const optional = page.locator('form').filter({ has: page.getByRole('combobox', { name: 'Optional permission', exact: true }) });
  await expect(account.getByLabel('Consent decision')).toHaveValue('');
  await expect(optional.getByLabel('Consent decision')).toHaveValue('');
  expect(fixture.writes).toHaveLength(0);
  await account.getByLabel('Policy version reviewed').fill('v1');
  await account.getByLabel('Consent decision').selectOption('grant');
  await account.getByRole('button', { name: 'Save consent decision' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Consent decision saved' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Privacy policy — Granted' })).toBeVisible();
  expect(fixture.writes).toEqual([{ consent_type: 'PRIVACY_POLICY', purpose: 'ACCOUNT_PRIVACY', consent_version: 'v1', company_id: null, granted: true }]);
  await expect(optional.getByLabel('Consent decision')).toHaveValue('');
  await optional.getByLabel('Policy version reviewed').fill('v2');
  await optional.getByLabel('Consent decision').selectOption('grant');
  await optional.getByRole('button', { name: 'Save consent decision' }).click();
  await expect(page.getByRole('heading', { name: 'Marketing communications — Granted' })).toBeVisible();
  expect(fixture.writes[1]).toEqual({ consent_type: 'MARKETING', purpose: 'MARKETING_COMMUNICATIONS', consent_version: 'v2', company_id: null, granted: true });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Privacy policy — Granted' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Marketing communications — Granted' })).toBeVisible();
});

test('company-specific consent can be withdrawn after the company becomes inactive', async ({ page }) => {
  const fixture = await privacyFixture(page);
  await page.goto('/security');
  const optional = page.locator('form').filter({ has: page.getByRole('combobox', { name: 'Optional permission', exact: true }) });
  await optional.getByRole('combobox', { name: 'Optional permission', exact: true }).selectOption('DATA_SHARING');
  await optional.getByRole('combobox', { name: 'Company', exact: true }).selectOption(fixture.company.id);
  await optional.getByLabel('Policy version reviewed').fill('2026.v1');
  await optional.getByLabel('Consent decision').selectOption('grant');
  await optional.getByRole('button', { name: 'Save consent decision' }).click();
  await expect(page.getByRole('heading', { name: 'Company data sharing — Granted' })).toBeVisible();
  expect(fixture.writes[0]).toEqual({ consent_type: 'DATA_SHARING', purpose: 'COMPANY_DATA_SHARING', company_id: fixture.company.id, consent_version: '2026.v1', granted: true });
  fixture.company.status = 'INACTIVE';
  await page.getByRole('button', { name: 'Withdraw Company data sharing for Fixture Company' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Withdrawal recorded' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Company data sharing — Withdrawn' })).toBeVisible();
  expect(fixture.writes[1]).toEqual({ ...fixture.writes[0], granted: false });
  expect(fixture.records).toHaveLength(2);
  expect(fixture.records[1].granted).toBe(true);
});

test('consent read and write failures are visible and retryable without a false success', async ({ page }) => {
  const fixture = await privacyFixture(page);
  fixture.controls.failRead = true;
  await page.goto('/security');
  await expect(page.getByRole('alert').filter({ hasText: 'Consent service temporarily unavailable' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  const account = page.locator('form').filter({ has: page.getByRole('combobox', { name: 'Account policy', exact: true }) });
  await account.getByLabel('Policy version reviewed').fill('v1');
  await account.getByLabel('Consent decision').selectOption('grant');
  fixture.controls.failWrite = true;
  await account.getByRole('button', { name: 'Save consent decision' }).click();
  await expect(account.getByRole('alert')).toContainText('Consent service temporarily unavailable');
  expect(fixture.writes).toHaveLength(0);
  await expect(page.getByRole('status').filter({ hasText: 'Consent decision saved' })).toHaveCount(0);
  await account.getByRole('button', { name: 'Save consent decision' }).click();
  await expect(page.getByRole('heading', { name: 'Privacy policy — Granted' })).toBeVisible();
  expect(fixture.writes).toHaveLength(1);
});
