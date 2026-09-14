import { test, expect } from '@playwright/test';
import { apiUrl, installFixtures, signIn } from '../../customer-web/tests/fixtures';

test('anonymous admin routes redirect to real sign in', async ({ page }) => {
  const fixture = await installFixtures(page);
  await page.goto('/companies');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Admin Sign In' })).toBeVisible();
  expect(fixture.requests).toHaveLength(0);
});

test('admin signs in, loads API metrics, and signs out', async ({ page }) => {
  const fixture = await installFixtures(page);
  await signIn(page);
  await expect(page.getByText('Total users', { exact: true })).toBeVisible();
  await expect(page.getByText('7', { exact: true })).toBeVisible();
  expect(fixture.requests.some((item) => item.path === '/admin/dashboard')).toBe(true);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/users');
  await expect(page).toHaveURL(/\/login$/);
});

test('forbidden records stay hidden and cannot offer mutations', async ({ page }) => {
  await installFixtures(page, { authenticated: true, deny: ['/admin/companies'] });
  await page.goto('/companies');
  await expect(
    page.getByRole('alert').filter({ hasText: 'You do not have permission' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create company' })).toHaveCount(0);
  await expect(page.getByRole('cell', { name: 'Fixture Company', exact: true })).toHaveCount(0);
});

test('company create and edit use allowlisted POST/PATCH and refresh records', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true });
  await page.goto('/companies');
  await expect(page.getByRole('cell', { name: 'Fixture Company', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create company' }).click();
  await page.getByLabel('Company code').fill('NEWCO');
  await page.getByLabel('Legal name').fill('New Fixture Ltd');
  await page.getByLabel('Display name').fill('New Fixture');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('cell', { name: 'New Fixture', exact: true })).toBeVisible();
  expect(
    fixture.requests.find((item) => item.method === 'POST' && item.path === '/admin/companies')
      ?.body,
  ).toMatchObject({
    company_code: 'NEWCO',
    legal_name: 'New Fixture Ltd',
    display_name: 'New Fixture',
  });
  await page
    .getByRole('row')
    .filter({ hasText: 'Fixture Company Ltd' })
    .getByRole('button', { name: 'Edit' })
    .click();
  await expect(page.getByLabel('Company code')).toHaveCount(0);
  await page.getByLabel('Display name').fill('Renamed Fixture');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('cell', { name: 'Renamed Fixture' })).toBeVisible();
  expect(fixture.requests.find((item) => item.method === 'PATCH')?.body).toEqual({
    display_name: 'Renamed Fixture',
  });
});

test('property updates do not change project ownership and can change status', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true });
  await page.goto('/properties');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Project', { exact: true })).toHaveCount(0);
  await page.getByLabel('Status', { exact: true }).selectOption('RESERVED');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('cell', { name: 'RESERVED', exact: true })).toBeVisible();
  expect(
    fixture.requests.find(
      (item) => item.method === 'PATCH' && item.path.startsWith('/admin/properties/'),
    )?.body,
  ).toEqual({ status: 'RESERVED' });
});

test('property creation and customer linking use real scoped reference lists', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true });
  await page.goto('/properties');
  await page.getByRole('button', { name: 'Create property' }).click();
  await page.getByLabel('Project', { exact: true }).selectOption(fixture.project.id);
  await page.getByLabel('Property code').fill('FIX-1401');
  await page.getByLabel('Asset type').selectOption('RESIDENTIAL');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('cell', { name: 'FIX-1401' })).toBeVisible();
  expect(
    fixture.requests.find((item) => item.method === 'POST' && item.path === '/admin/properties')
      ?.body,
  ).toMatchObject({
    project_id: fixture.project.id,
    property_code: 'FIX-1401',
    status: 'AVAILABLE',
    currency: 'PHP',
  });
  await page.goto('/customer-properties');
  await page.getByRole('button', { name: 'Create relationship' }).click();
  await page.getByLabel('Customer', { exact: true }).selectOption(fixture.account.id);
  await page.getByLabel('Property', { exact: true }).selectOption(fixture.property.id);
  await page.getByLabel('Relationship', { exact: true }).selectOption('BUYER');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Changes saved.' })).toBeVisible();
  expect(
    fixture.requests.find(
      (item) => item.method === 'POST' && item.path === '/admin/customer-properties',
    )?.body,
  ).toEqual({
    customer_id: fixture.account.id,
    property_id: fixture.property.id,
    relationship_type: 'BUYER',
  });
});

test('projects can be created against an authorized company', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true });
  await page.goto('/projects');
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.getByLabel('Company', { exact: true }).selectOption(fixture.company.id);
  await page.getByLabel('Project code').fill('FIX-T2');
  await page.getByLabel('Project name').fill('Fixture Tower Two');
  await page.getByLabel('Status', { exact: true }).selectOption('ACTIVE');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('cell', { name: 'Fixture Tower Two', exact: true })).toBeVisible();
  expect(
    fixture.requests.find((item) => item.path === '/admin/projects' && item.method === 'POST')
      ?.body,
  ).toMatchObject({
    company_id: fixture.company.id,
    project_code: 'FIX-T2',
    project_name: 'Fixture Tower Two',
    status: 'ACTIVE',
  });
});

test('flag mutations require confirmation; future wallet cannot be enabled', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true });
  await page.goto('/feature-flags');
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: 'ENABLE_WALLET' })
      .getByRole('button', { name: 'Enable', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('row')
    .filter({ hasText: 'ENABLE_PROPERTIES' })
    .getByRole('button', { name: 'Disable', exact: true })
    .click();
  expect(fixture.requests.filter((item) => item.method === 'PATCH')).toHaveLength(0);
  await page.getByRole('button', { name: 'Confirm change' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Changes saved.' })).toBeVisible();
  expect(fixture.requests.find((item) => item.method === 'PATCH')?.body).toEqual({
    enabled: false,
  });
});

test('failed mutations retain edits and never report success', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true });
  await page.goto('/companies');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Display name').fill('Unsaved change');
  await page.route(`**/admin/companies/${fixture.company.id}`, (route) =>
    route.fulfill({
      status: 409,
      json: { success: false, error: { code: 'CONFLICT', message: 'Resource conflict' } },
    }),
  );
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Resource conflict' })).toBeVisible();
  await expect(page.getByLabel('Display name')).toHaveValue('Unsaved change');
  await expect(page.getByText('Changes saved.', { exact: true })).toHaveCount(0);
});

for (const [path, value] of [
  ['customers', 'alex@example.test'],
  ['rhc-digital-ids', 'RHC-2026-00000042'],
  ['users', 'Alex'],
  ['projects', 'Fixture Tower'],
  ['roles', 'Fixture Operator'],
  ['permissions', 'company.view'],
  ['integrations', 'Fixture Integration'],
  ['business-services', 'Fixture Resident Services'],
  ['audit-logs', 'company.update'],
  ['system-settings', 'PLATFORM_NAME'],
]) {
  test(`${path} displays API records rather than module placeholders`, async ({ page }) => {
    await installFixtures(page, {
      authenticated: true,
      businessVerified: path === 'rhc-digital-ids',
    });
    await page.goto(`/${path}`);
    await expect(page.getByRole('cell', { name: value, exact: true })).toBeVisible();
  });
}

for (const [path, status] of [
  ['users', 'UNVERIFIED'],
  ['customers', 'PENDING'],
  ['users', 'REJECTED'],
] as const) {
  test(`${path} requires a reviewed reference before approving ${status}`, async ({ page }) => {
    const fixture = await installFixtures(page, { authenticated: true, reviewCandidate: true });
    fixture.candidate.verification_status = status;
    await page.goto(`/${path}`);
    await page
      .getByRole('row')
      .filter({ hasText: fixture.candidate.email })
      .getByRole('button', { name: 'Review verification' })
      .click();
    await expect(page.getByRole('button', { name: 'Confirm approval' })).toBeDisabled();
    expect(fixture.requests.filter((item) => item.method === 'POST')).toHaveLength(0);
    await page.getByLabel('Review reference', { exact: true }).fill('invalid/reference');
    await page.getByLabel('I completed the business review').check();
    await page.getByRole('button', { name: 'Confirm approval' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: '3–120 character review reference' }),
    ).toBeVisible();
    expect(fixture.requests.filter((item) => item.method === 'POST')).toHaveLength(0);
    await page.getByLabel('Review reference', { exact: true }).fill('REVIEW-2026.42_case:3');
    await page.getByRole('button', { name: 'Confirm approval' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Business verification approved.' }),
    ).toBeVisible();
    const approval = fixture.requests.filter((item) => item.path.endsWith('/verification/approve'));
    expect(approval).toHaveLength(1);
    expect(approval[0]).toMatchObject({
      path: `/admin/users/${fixture.candidate.id}/verification/approve`,
      method: 'POST',
      body: { expected_status: status, review_reference: 'REVIEW-2026.42_case:3' },
    });
    await expect(
      page
        .getByRole('row')
        .filter({ hasText: fixture.candidate.email })
        .getByRole('cell', { name: 'VERIFIED', exact: true }),
    ).toBeVisible();
    expect(fixture.candidate.profile.rhc_id).toBeNull();
  });
}

test('self-approval and known ineligible accounts never offer approval actions', async ({
  page,
}) => {
  const fixture = await installFixtures(page, { authenticated: true, reviewCandidate: true });
  fixture.candidate.account_status = 'PENDING';
  await page.goto('/users');
  const self = page.getByRole('row').filter({ hasText: fixture.account.email });
  await expect(self.getByText('Self-approval is not allowed.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review verification' })).toHaveCount(0);
  fixture.candidate.account_status = 'ACTIVE';
  fixture.candidate.auth_email_confirmed_at = null;
  await page.getByRole('button', { name: 'Refresh records' }).click();
  await expect(page.getByText('Confirmed email is required before approval.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review verification' })).toHaveCount(0);
  expect(fixture.requests.filter((item) => item.method === 'POST')).toHaveLength(0);
});

test('omitted admin email-confirmation field is not presented as confirmed; cancelling is read-only', async ({
  page,
}) => {
  const fixture = await installFixtures(page, { authenticated: true, reviewCandidate: true });
  fixture.candidate.auth_email_confirmed_at = undefined;
  await page.goto('/customers');
  await page.getByRole('button', { name: 'Review verification' }).click();
  await expect(page.getByText('Not returned by this list; the API will check.')).toBeVisible();
  await page.getByLabel('Review reference', { exact: true }).fill('REVIEW:42');
  await page.getByLabel('I completed the business review').check();
  await page.getByRole('button', { name: 'Cancel review' }).click();
  await expect(page.getByRole('heading', { name: 'Review business verification' })).toHaveCount(0);
  expect(fixture.requests.filter((item) => item.method === 'POST')).toHaveLength(0);
});

test('approval rejects stale expected status and requires a fresh review', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true, reviewCandidate: true });
  await page.goto('/users');
  await page.getByRole('button', { name: 'Review verification' }).click();
  await page.getByLabel('Review reference', { exact: true }).fill('REVIEW:42');
  await page.getByLabel('I completed the business review').check();
  fixture.candidate.verification_status = 'REJECTED';
  await page.getByRole('button', { name: 'Confirm approval' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'account changed or is no longer eligible' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm approval' })).toBeDisabled();
  expect(
    fixture.requests.find((item) => item.path.endsWith('/verification/approve'))?.body
      ?.expected_status,
  ).toBe('PENDING');
  expect(fixture.candidate.verification_status).toBe('REJECTED');
  await page.getByRole('button', { name: 'Cancel review' }).click();
  await page.getByRole('button', { name: 'Review verification' }).click();
  await expect(page.getByLabel('Review reference', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('I completed the business review')).not.toBeChecked();
});

test('list visibility cannot bypass the global approval permission', async ({ page }) => {
  const fixture = await installFixtures(page, {
    authenticated: true,
    reviewCandidate: true,
    deny: ['/admin/users/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/verification/approve'],
  });
  await page.goto('/customers');
  await page.getByRole('button', { name: 'Review verification' }).click();
  await page.getByLabel('Review reference', { exact: true }).fill('REVIEW:42');
  await page.getByLabel('I completed the business review').check();
  await page.getByRole('button', { name: 'Confirm approval' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Global user.manage permission is required' }),
  ).toBeVisible();
  await expect(page.getByLabel('Review reference', { exact: true })).toHaveValue('REVIEW:42');
  await expect(page.getByText('Business verification approved.', { exact: true })).toHaveCount(0);
  expect(fixture.candidate.verification_status).toBe('PENDING');
});

test('approval cannot be submitted twice while the request is pending', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true, reviewCandidate: true });
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let submissions = 0;
  await page.route(
    `${apiUrl}/admin/users/${fixture.candidate.id}/verification/approve`,
    async (route) => {
      submissions++;
      await pending;
      await route.fallback();
    },
  );
  await page.goto('/users');
  await page.getByRole('button', { name: 'Review verification' }).click();
  await page.getByLabel('Review reference', { exact: true }).fill('REVIEW:42');
  await page.getByLabel('I completed the business review').check();
  await page.getByRole('button', { name: 'Confirm approval' }).click();
  await expect(page.getByRole('button', { name: 'Approving…' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Cancel review' })).toBeDisabled();
  finish();
  await expect(
    page.getByRole('status').filter({ hasText: 'Business verification approved.' }),
  ).toBeVisible();
  expect(submissions).toBe(1);
});

test('records beyond the first API page can be loaded and searched', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true });
  fixture.lists['/admin/companies'] = Array.from({ length: 101 }, (_, i) => ({
    id: `company-${i}`,
    company_code: `C${i}`,
    display_name: `Company ${i}`,
    legal_name: `Company ${i} Ltd`,
  }));
  await page.goto('/companies');
  await page.getByRole('button', { name: 'Load more records' }).click();
  await page.getByLabel('Search records').fill('Company 100');
  await expect(page.getByRole('cell', { name: 'Company 100', exact: true })).toBeVisible();
});
