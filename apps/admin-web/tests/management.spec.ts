import { test, expect, type Page } from '@playwright/test';
import { apiUrl } from '../../customer-web/tests/fixtures';
import { installManagementFixture } from './management-fixture';

type Fixture = Awaited<ReturnType<typeof installManagementFixture>>;
const writes = (fixture: Fixture) => fixture.requests.filter((item) => item.method !== 'GET');
async function confirm(page: Page) {
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Confirm reviewed changes' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm changes', exact: true }).click();
}
async function reviewReference(page: Page) {
  await page.getByLabel('Review reference', { exact: true }).fill('OPS-2026:42');
}

test('project PATCH reviews allowlisted metadata and UTC dates without changing ownership', async ({
  page,
}) => {
  const fixture = await installManagementFixture(page);
  await page.goto('/projects');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Company', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Project code')).toHaveCount(0);
  await page.getByLabel('Project name').fill('Reviewed Tower');
  await page.getByLabel('Description', { exact: true }).fill('');
  await page.getByLabel('Location').fill('Cebu');
  await page.getByLabel('Status', { exact: true }).selectOption('ON_HOLD');
  await page.getByLabel('Start date (UTC)').fill('2026-02-02T12:30');
  await page.getByLabel('Target completion (UTC)').fill('');
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  expect(writes(fixture)).toHaveLength(0);
  await page.getByRole('button', { name: 'Confirm changes', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Reviewed Tower', exact: true })).toBeVisible();
  expect(writes(fixture)[0]).toMatchObject({
    method: 'PATCH',
    path: `/admin/projects/${fixture.project.id}`,
    body: {
      project_name: 'Reviewed Tower',
      description: null,
      location: 'Cebu',
      status: 'ON_HOLD',
      start_date: '2026-02-02T12:30:00.000Z',
      target_completion: null,
    },
  });
});

test('relationship edit validates effective range and never changes customer/property IDs', async ({
  page,
}) => {
  const fixture = await installManagementFixture(page);
  await page.goto('/customer-properties');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Customer', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Property', { exact: true })).toHaveCount(0);
  await page.getByLabel('Relationship', { exact: true }).selectOption('TENANT');
  await page.getByLabel('Status', { exact: true }).selectOption('INACTIVE');
  await page.getByLabel('Effective from (UTC)').fill('2026-03-01T00:00');
  await page.getByLabel('Effective to (UTC)').fill('2026-02-01T00:00');
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'End must follow' })).toBeVisible();
  expect(writes(fixture)).toHaveLength(0);
  await page.getByLabel('Effective to (UTC)').fill('2027-03-01T00:00');
  await confirm(page);
  await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
  expect(writes(fixture)[0].body).toEqual({
    relationship_type: 'TENANT',
    status: 'INACTIVE',
    effective_from: '2026-03-01T00:00:00.000Z',
    effective_to: '2027-03-01T00:00:00.000Z',
  });
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Effective to (UTC)').fill('');
  await confirm(page);
  await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
  expect(writes(fixture)[1].body).toEqual({ effective_to: null });
});

test('role metadata create/edit and reviewed deletion preserve protected roles', async ({
  page,
}) => {
  const fixture = await installManagementFixture(page);
  await page.goto('/roles');
  const protectedRow = page.getByRole('row').filter({ hasText: 'Bootstrap administrator' });
  await expect(protectedRow.getByRole('button')).toHaveCount(0);
  await page.getByRole('button', { name: 'Create role', exact: true }).click();
  await page.getByLabel('Company', { exact: true }).selectOption(fixture.company.id);
  await page.getByLabel('Role code').fill('SUPPORT_OPERATOR');
  await page.getByLabel('Role name').fill('Support Operator');
  await confirm(page);
  await expect(page.getByRole('cell', { name: 'Support Operator', exact: true })).toBeVisible();
  expect(writes(fixture)[0].body).toEqual({
    company_id: fixture.company.id,
    code: 'SUPPORT_OPERATOR',
    name: 'Support Operator',
    description: null,
  });
  const row = page.getByRole('row').filter({ hasText: 'SUPPORT_OPERATOR' });
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Role code')).toHaveCount(0);
  await expect(page.getByLabel('Company', { exact: true })).toHaveCount(0);
  await page.getByLabel('Role name').fill('Reviewed Support');
  await confirm(page);
  await expect(row.getByRole('cell', { name: 'Reviewed Support', exact: true })).toBeVisible();
  expect(writes(fixture)[1].body).toEqual({ name: 'Reviewed Support' });
  await row.getByRole('button', { name: 'Remove role', exact: true }).click();
  await reviewReference(page);
  await confirm(page);
  await expect(row).toHaveCount(0);
  expect(writes(fixture)[2]).toMatchObject({
    method: 'DELETE',
    body: { review_reference: 'OPS-2026:42' },
  });
});

test('role permissions preselect current grants and explicitly review full and empty replacements', async ({
  page,
}) => {
  const fixture = await installManagementFixture(page);
  await page.goto('/roles');
  await page.getByRole('button', { name: 'Manage permissions' }).click();
  await expect(page.getByLabel('company.view', { exact: false })).toBeChecked();
  await page.getByLabel('project.view', { exact: false }).check();
  await reviewReference(page);
  await confirm(page);
  await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
  expect(writes(fixture)[0]).toMatchObject({
    method: 'PUT',
    path: `/admin/roles/${fixture.role.id}/permissions`,
    body: {
      permission_ids: [fixture.permission.id, fixture.secondPermission.id],
      review_reference: 'OPS-2026:42',
    },
  });
  await page.getByRole('button', { name: 'Manage permissions' }).click();
  await page.getByLabel('company.view', { exact: false }).uncheck();
  await page.getByLabel('project.view', { exact: false }).uncheck();
  await reviewReference(page);
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await expect(page.getByText('None — revoke all permissions', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm changes', exact: true }).click();
  await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
  expect(writes(fixture)[1].body).toEqual({ permission_ids: [], review_reference: 'OPS-2026:42' });
});

test('permission catalog denial blocks replacement rather than revoking unseen grants', async ({
  page,
}) => {
  const fixture = await installManagementFixture(page, { deny: ['/admin/permissions'] });
  await page.goto('/roles');
  await page.getByRole('button', { name: 'Manage permissions' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'You do not have permission' }),
  ).toBeVisible();
  await reviewReference(page);
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Load the current grants' }),
  ).toBeVisible();
  expect(writes(fixture)).toHaveLength(0);
});

test('account status uses current expected_status and leaves business verification alone', async ({
  page,
}) => {
  const fixture = await installManagementFixture(page);
  await page.goto('/users');
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: fixture.account.email })
      .getByRole('button', { name: 'Change account status' }),
  ).toBeDisabled();
  await page
    .getByRole('row')
    .filter({ hasText: fixture.candidate.email })
    .getByRole('button', { name: 'Change account status' })
    .click();
  await page.getByLabel('Account status', { exact: true }).selectOption('LOCKED');
  await reviewReference(page);
  await confirm(page);
  await expect(page.getByRole('cell', { name: 'LOCKED', exact: true })).toBeVisible();
  expect(writes(fixture)[0]).toMatchObject({
    method: 'PATCH',
    path: `/admin/users/${fixture.candidate.id}/status`,
    body: { account_status: 'LOCKED', expected_status: 'ACTIVE', review_reference: 'OPS-2026:42' },
  });
  expect(fixture.candidate.verification_status).toBe('PENDING');
});

test('stale status blocks repeat confirmation and requires a fresh review', async ({ page }) => {
  const fixture = await installManagementFixture(page);
  await page.goto('/users');
  await page
    .getByRole('row')
    .filter({ hasText: fixture.candidate.email })
    .getByRole('button', { name: 'Change account status' })
    .click();
  await page.getByLabel('Account status', { exact: true }).selectOption('DISABLED');
  await reviewReference(page);
  fixture.candidate.account_status = 'LOCKED';
  await confirm(page);
  await expect(page.getByRole('alert').filter({ hasText: 'record changed' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm changes', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page
    .getByRole('row')
    .filter({ hasText: fixture.candidate.email })
    .getByRole('button', { name: 'Change account status' })
    .click();
  await page.getByLabel('Account status', { exact: true }).selectOption('DISABLED');
  await reviewReference(page);
  await confirm(page);
  await expect(page.getByRole('cell', { name: 'DISABLED', exact: true })).toBeVisible();
  expect(writes(fixture)[1].body?.expected_status).toBe('LOCKED');
});

test('global assignment list uses real references, scope, expiry and reviewed removal', async ({
  page,
}) => {
  const fixture = await installManagementFixture(page);
  await page.goto('/user-roles');
  await expect(
    page.getByRole('heading', { name: 'User Roles', exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove assignment' })).toHaveCount(1);
  expect(fixture.requests.some((item) => item.path === '/admin/user-roles')).toBe(true);
  await page.getByRole('button', { name: 'Assign role', exact: true }).click();
  await page.getByLabel('User', { exact: true }).selectOption(fixture.candidate.id);
  await page.getByLabel('Role', { exact: true }).selectOption(fixture.role.id);
  await expect(
    page
      .getByLabel('Role', { exact: true })
      .getByRole('option', { name: /Bootstrap administrator/ }),
  ).toHaveCount(0);
  await expect(
    page
      .getByLabel('User', { exact: true })
      .getByRole('option', { name: new RegExp(fixture.account.email) }),
  ).toHaveCount(0);
  await page.getByLabel('Company', { exact: true }).selectOption(fixture.company.id);
  await page.getByLabel('Project', { exact: true }).selectOption(fixture.project.id);
  await page.getByLabel('Expires at (UTC)').fill('2099-01-01T00:00');
  await reviewReference(page);
  await confirm(page);
  await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
  expect(writes(fixture)[0]).toMatchObject({
    method: 'POST',
    path: '/admin/user-roles',
    body: {
      user_id: fixture.candidate.id,
      role_id: fixture.role.id,
      company_id: fixture.company.id,
      project_id: fixture.project.id,
      expires_at: '2099-01-01T00:00:00.000Z',
      review_reference: 'OPS-2026:42',
    },
  });
  await page
    .getByRole('row')
    .filter({ hasText: fixture.assignment.id })
    .getByRole('button', { name: 'Remove assignment' })
    .click();
  await reviewReference(page);
  await confirm(page);
  await expect(page.getByRole('cell', { name: fixture.assignment.id, exact: true })).toHaveCount(0);
  expect(writes(fixture)[1]).toMatchObject({
    method: 'DELETE',
    path: `/admin/user-roles/${fixture.assignment.id}`,
    body: { review_reference: 'OPS-2026:42' },
  });
});

test('assignment pagination and forbidden global listing do not infer scope from users', async ({
  page,
}) => {
  const fixture = await installManagementFixture(page);
  fixture.lists['/admin/user-roles'] = Array.from({ length: 105 }, (_, index) => ({
    ...fixture.assignment,
    id: `assignment-${index}`,
    user_id: `user-${index}`,
  }));
  const urls: URL[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/admin/user-roles')) urls.push(new URL(request.url()));
  });
  await page.goto('/user-roles');
  await page.getByRole('button', { name: 'Load more records' }).click();
  await page.getByLabel('Search records').fill('user-104');
  await expect(page.getByRole('cell', { name: 'assignment-104', exact: true })).toBeVisible();
  expect(urls.map((url) => [...url.searchParams.keys()])).toEqual([
    ['take', 'skip'],
    ['take', 'skip'],
  ]);
  await page.route(`${apiUrl}/admin/user-roles**`, (route) =>
    route.fulfill({
      status: 403,
      json: { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
    }),
  );
  await page.getByRole('button', { name: 'Refresh records' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'You do not have permission' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assign role', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Remove assignment' })).toHaveCount(0);
});

for (const resource of ['integrations', 'business-services'] as const) {
  test(`${resource} create and PATCH are metadata-only with immutable keys and company`, async ({
    page,
  }) => {
    const fixture = await installManagementFixture(page);
    await page.goto(`/${resource}`);
    await page
      .getByRole('button', {
        name: resource === 'integrations' ? 'Create integration' : 'Create business service',
        exact: true,
      })
      .click();
    await page.getByLabel('Company', { exact: true }).selectOption(fixture.company.id);
    if (resource === 'integrations') {
      await page.getByLabel('Integration key').fill('resident.sync');
      await page.getByLabel('Integration name').fill('Reviewed Sync');
    } else {
      await page.getByLabel('Service code').fill('SUPPORT');
      await page.getByLabel('Service name').fill('Reviewed Support');
      await page.getByLabel('Service type').fill('RESIDENT');
      await page.getByLabel('Requires property').check();
      await page.getByLabel('Requires resident status').check();
    }
    await confirm(page);
    await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
    expect(writes(fixture)[0].body).toEqual(
      resource === 'integrations'
        ? {
            company_id: fixture.company.id,
            integration_key: 'resident.sync',
            name: 'Reviewed Sync',
            status: 'NOT_CONFIGURED',
          }
        : {
            company_id: fixture.company.id,
            service_code: 'SUPPORT',
            service_name: 'Reviewed Support',
            service_type: 'RESIDENT',
            description: null,
            status: 'ACTIVE',
            requires_property: true,
            requires_resident_status: true,
            integration_status: 'NOT_CONFIGURED',
          },
    );
    const row = page.getByRole('row').filter({
      hasText: resource === 'integrations' ? 'Fixture Integration' : 'Fixture Resident Services',
    });
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.getByLabel('Company', { exact: true })).toHaveCount(0);
    await expect(
      page.getByLabel(resource === 'integrations' ? 'Integration key' : 'Service code'),
    ).toHaveCount(0);
    await expect(page.getByLabel(/secret|credential|configuration|json/i)).toHaveCount(0);
    await page
      .getByLabel('Status', { exact: true })
      .selectOption(resource === 'integrations' ? 'SUSPENDED' : 'DISABLED');
    if (resource === 'business-services') await page.getByLabel('Requires property').uncheck();
    await confirm(page);
    await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
    expect(writes(fixture)[1].body).toEqual(
      resource === 'integrations'
        ? { status: 'SUSPENDED' }
        : { status: 'DISABLED', requires_property: false },
    );
  });
}

test('settings only offer typed allowlisted values, including first-write upserts', async ({
  page,
}) => {
  const fixture = await installManagementFixture(page);
  await page.goto('/system-settings');
  await expect(
    page.getByRole('row').filter({ hasText: 'authentication_policy' }).getByRole('button'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit setting', exact: true }).click();
  await expect(page.getByLabel('Support email')).toHaveValue('support@example.test');
  await page.getByLabel('Support email').fill('help@example.test');
  await reviewReference(page);
  await confirm(page);
  await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
  expect(writes(fixture)[0]).toMatchObject({
    method: 'PUT',
    path: '/admin/system-settings/support_contact',
    body: { value: { email: 'help@example.test' }, review_reference: 'OPS-2026:42' },
  });
  await page.getByRole('button', { name: 'Set managed setting', exact: true }).click();
  await expect(page.getByLabel('Setting key').getByRole('option')).toHaveCount(3);
  await page.getByLabel('Setting key').selectOption('maintenance_notice');
  await page.getByLabel('Notice enabled').check();
  await page.getByLabel('Notice message').fill('Planned maintenance');
  await reviewReference(page);
  await confirm(page);
  await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
  expect(writes(fixture)[1]).toMatchObject({
    method: 'PUT',
    path: '/admin/system-settings/maintenance_notice',
    body: {
      value: { enabled: true, message: 'Planned maintenance' },
      review_reference: 'OPS-2026:42',
    },
  });
  await page.getByRole('button', { name: 'Set managed setting', exact: true }).click();
  await page.getByLabel('Setting key').selectOption('month_1_acceptance_state');
  await page.getByLabel('Acceptance status').selectOption('under_review');
  await reviewReference(page);
  await confirm(page);
  await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
  expect(writes(fixture)[2]).toMatchObject({
    method: 'PUT',
    path: '/admin/system-settings/month_1_acceptance_state',
    body: { value: { status: 'under_review' }, review_reference: 'OPS-2026:42' },
  });
});

test('denied writes preserve form values, cancellation is read-only, and API remains authority', async ({
  page,
}) => {
  const fixture = await installManagementFixture(page);
  fixture.fail.set(`/admin/integrations/${fixture.integration.id}`, 403);
  await page.goto('/integrations');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Integration name').fill('Retained edit');
  await confirm(page);
  await expect(
    page.getByRole('alert').filter({ hasText: 'You do not have permission' }),
  ).toBeVisible();
  await expect(page.getByText('Changes saved.', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to edit' }).click();
  await expect(page.getByLabel('Integration name')).toHaveValue('Retained edit');
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(writes(fixture)).toHaveLength(1);
  await expect(page.getByRole('cell', { name: 'Fixture Integration', exact: true })).toBeVisible();
});

test('governance write denial cannot be bypassed by visible role records', async ({ page }) => {
  const fixture = await installManagementFixture(page);
  fixture.fail.set(`/admin/roles/${fixture.role.id}/permissions`, 403);
  await page.goto('/roles');
  await page.getByRole('button', { name: 'Manage permissions' }).click();
  await page.getByLabel('project.view', { exact: false }).check();
  await reviewReference(page);
  await confirm(page);
  await expect(
    page.getByRole('alert').filter({ hasText: 'You do not have permission' }),
  ).toBeVisible();
  await expect(page.getByText('Changes saved.', { exact: true })).toHaveCount(0);
  expect(fixture.role.role_permissions.map((grant) => grant.permission_id)).toEqual([
    fixture.permission.id,
  ]);
  await page.getByRole('button', { name: 'Back to edit' }).click();
  await expect(page.getByLabel('project.view', { exact: false })).toBeChecked();
});

test('unavailable optional scope lists cannot silently create a global assignment', async ({
  page,
}) => {
  const fixture = await installManagementFixture(page, { deny: ['/admin/companies'] });
  await page.goto('/user-roles');
  await page.getByRole('button', { name: 'Assign role', exact: true }).click();
  await page.getByLabel('User', { exact: true }).selectOption(fixture.candidate.id);
  await page.getByLabel('Role', { exact: true }).selectOption(fixture.role.id);
  await expect(
    page.getByRole('alert').filter({ hasText: 'You do not have permission' }),
  ).toBeVisible();
  await reviewReference(page);
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Reload the company options' }),
  ).toBeVisible();
  expect(writes(fixture)).toHaveLength(0);
});

test('missing current role grants block replacement and malformed review references never write', async ({
  page,
}) => {
  const fixture = await installManagementFixture(page);
  Reflect.deleteProperty(fixture.role, 'role_permissions');
  await page.goto('/roles');
  await page.getByRole('button', { name: 'Manage permissions' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Current grants were not returned' }),
  ).toBeVisible();
  await reviewReference(page);
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Load the current grants' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.goto('/user-roles');
  await page.getByRole('button', { name: 'Remove assignment', exact: true }).click();
  await expect(page.getByLabel('Assignment under review')).toContainText(fixture.candidate.id);
  await expect(page.getByLabel('Assignment under review')).toContainText('Global');
  await page.getByLabel('Review reference', { exact: true }).fill('invalid reference');
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Confirm reviewed changes' })).toHaveCount(0);
  expect(writes(fixture)).toHaveLength(0);
});

test('assignment scope mismatch and expired grants are rejected before review', async ({
  page,
}) => {
  const fixture = await installManagementFixture(page);
  fixture.lists['/admin/companies'].push({
    ...fixture.company,
    id: '33333333-3333-4333-8333-333333333334',
    display_name: 'Other company',
  });
  await page.goto('/user-roles');
  await page.getByRole('button', { name: 'Assign role', exact: true }).click();
  await page.getByLabel('User', { exact: true }).selectOption(fixture.candidate.id);
  await page.getByLabel('Role', { exact: true }).selectOption(fixture.role.id);
  await page
    .getByLabel('Company', { exact: true })
    .selectOption('33333333-3333-4333-8333-333333333334');
  await page.getByLabel('Project', { exact: true }).selectOption(fixture.project.id);
  await reviewReference(page);
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Role/project company scope mismatch' }),
  ).toBeVisible();
  await page.getByLabel('Company', { exact: true }).selectOption(fixture.company.id);
  await page.getByLabel('Expires at (UTC)').fill('2020-01-01T00:00');
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Expiry must be in the future' }),
  ).toBeVisible();
  expect(writes(fixture)).toHaveLength(0);
});

test('confirmation locks all competing actions while a mutation is pending', async ({ page }) => {
  const fixture = await installManagementFixture(page);
  let finish: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let submissions = 0;
  await page.route(`${apiUrl}/admin/roles/${fixture.role.id}/permissions`, async (route) => {
    submissions++;
    await pending;
    await route.fallback();
  });
  await page.goto('/roles');
  await page.getByRole('button', { name: 'Manage permissions' }).click();
  await reviewReference(page);
  await confirm(page);
  await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Create role', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Manage permissions' })).toBeDisabled();
  expect(submissions).toBe(1);
  finish();
  await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
  expect(writes(fixture)).toHaveLength(1);
});
