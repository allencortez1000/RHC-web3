import { test, expect, type Locator, type Page, type Request } from './offline-test';
import { approvalBlockReason } from '../app/verification-review';
import { apiUrl, installFixtures, signIn, token } from '../../customer-web/tests/fixtures';

type Fixture = Awaited<ReturnType<typeof installFixtures>>;
const appContent = (page: Page) => page.locator('main').first();

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function deferNextRequest(page: Page, url: string) {
  const started = deferred<Request>();
  const resume = deferred<void>();
  let calls = 0;
  await page.route(url, async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fallback();
    calls++;
    if (calls !== 1) return route.fallback();
    started.resolve(route.request());
    await resume.promise;
    await route.fallback();
  });
  return {
    started: started.promise,
    count: () => calls,
    async release() {
      const request = await started.promise;
      const finished = page.waitForEvent('requestfinished', { predicate: (item) => item === request });
      resume.resolve(undefined);
      await finished;
      // Drain the response continuation and React's next render, not a timed sleep.
      await page.evaluate(() => new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }));
    },
  };
}

function observeAdminWrites(page: Page) {
  const writes: Request[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith(`${apiUrl}/admin/`) && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method())) {
      writes.push(request);
    }
  });
  return writes;
}

const mutationWorkflows = ['company editor', 'management review', 'reservation action', 'feature flag', 'verification review'] as const;
type MutationWorkflow = typeof mutationWorkflows[number];

async function prepareMutation(page: Page, fixture: Fixture, workflow: MutationWorkflow) {
  let title: string;
  let submitName: string;
  let path: string;
  let body: Record<string, unknown>;
  switch (workflow) {
    case 'company editor':
      await page.goto('/companies');
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      await page.getByLabel('Display name').fill('Reviewed company');
      title = 'Edit companies';
      submitName = 'Save changes';
      path = `/admin/companies/${fixture.company.id}`;
      body = { display_name: 'Reviewed company' };
      break;
    case 'management review':
      await page.goto('/projects');
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      await page.getByLabel('Project name').fill('Reviewed project');
      await page.getByRole('button', { name: 'Review changes', exact: true }).click();
      title = 'Edit projects';
      submitName = 'Confirm changes';
      path = `/admin/projects/${fixture.project.id}`;
      body = { project_name: 'Reviewed project' };
      break;
    case 'reservation action':
      path = `/admin/reservations/${fixture.reservation.id}/confirm`;
      // This one workflow needs a successful action response; do not expand the shared fixture.
      await page.route(`${apiUrl}${path}`, async (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        fixture.reservation.status = 'CONFIRMED';
        await route.fulfill({ json: { success: true, data: fixture.reservation } });
      });
      await page.goto('/reservations');
      await page.getByRole('button', { name: 'Confirm', exact: true }).click();
      title = 'Confirm reservation action';
      submitName = 'Confirm action';
      body = { review_reference: 'ADMIN-CONFIRM', note: 'Admin confirm action' };
      break;
    case 'feature flag':
      await page.goto('/feature-flags');
      await page.getByRole('row').filter({ hasText: 'ENABLE_PROPERTIES' }).getByRole('button', { name: 'Disable', exact: true }).click();
      title = 'Confirm feature flag change';
      submitName = 'Confirm change';
      path = `/admin/feature-flags/${fixture.flags[0].id}`;
      body = { enabled: false };
      break;
    case 'verification review':
      await page.goto('/rhc-digital-ids');
      await page.getByRole('row').filter({ hasText: fixture.candidate.email }).getByRole('button', { name: 'Review verification' }).click();
      await page.getByLabel('Review reference', { exact: true }).fill('REVIEW:delayed');
      await page.getByLabel('I completed the business review').check();
      title = 'Review business verification';
      submitName = 'Confirm approval';
      path = `/admin/users/${fixture.candidate.id}/verification/approve`;
      body = { expected_status: 'PENDING', review_reference: 'REVIEW:delayed' };
      break;
  }
  const card = page.getByRole('heading', { name: title, exact: true }).locator('..');
  return {
    card, path, body,
    submit: card.getByRole('button', { name: submitName, exact: true }),
    cancel: card.getByRole('button', { name: workflow === 'verification review' ? 'Cancel review' : 'Cancel', exact: true }),
  };
}

async function submitTwiceInOneTurn(button: Locator) {
  await button.evaluate((element) => {
    const submit = element as HTMLButtonElement;
    if (submit.form && submit.type === 'submit') {
      submit.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      submit.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    } else {
      submit.click();
      submit.click();
    }
  });
}

test('approval eligibility requires a runtime actor and rejects self or scoped-only review', async () => {
  const candidate = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', account_status: 'ACTIVE', verification_status: 'PENDING', profile: {} };
  expect(approvalBlockReason(candidate)).toBe('Your application identity must be verified first.');
  expect(approvalBlockReason(candidate, candidate.id)).toBe('Self-approval is not allowed.');
  expect(approvalBlockReason(candidate, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')).toBeNull();
  expect(approvalBlockReason({ ...candidate, account_status: 'PENDING' }, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')).toBe('An ACTIVE account is required.');
});

test('anonymous admin routes redirect to real sign in', async ({ page }) => {
  const fixture = await installFixtures(page);
  await page.goto('/companies');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Admin Sign In' })).toBeVisible();
  expect(fixture.requests).toHaveLength(0);
});

test('admin signs in, loads API metrics, and signs out', async ({ page }) => {
  const fixture = await installFixtures(page);
  await signIn(page, /\/$/);
  await expect(page.getByText('Total users', { exact: true })).toBeVisible();
  await expect(page.getByText('7', { exact: true })).toBeVisible();
  expect(fixture.requests.some((item) => item.path === '/admin/dashboard')).toBe(true);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/users');
  await expect(page).toHaveURL(/\/login$/);
});

test('restricted Admin sign-in lands in the first usable module without requesting dashboard', async ({ page }) => {
  const fixture = await installFixtures(page, { adminPermissions: ['property.view'] });
  await signIn(page, /\/properties$/);
  await expect(page.getByRole('cell', { name: 'FIX-1205', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toHaveCount(0);
  expect(fixture.requests.some((item) => item.path === '/admin/dashboard')).toBe(false);
});

test('company-scoped role.view keeps Roles available but blocks User Roles deep links', async ({ page }) => {
  const fixture = await installFixtures(page, {
    authenticated: true,
    adminPermissions: ['role.view'],
    adminGrants: {
      'role.view': [{ company_id: '33333333-3333-4333-8333-333333333333', project_id: null }],
    },
  });
  await page.goto('/roles');
  await expect(page.getByRole('cell', { name: 'Fixture Operator', exact: true })).toBeVisible();
  await page.goto('/user-roles');
  await expect(page.getByRole('heading', { name: 'No administrative access' })).toBeVisible();
  expect(fixture.requests.filter((item) => item.path === '/admin/roles')).toHaveLength(1);
  expect(fixture.requests.some((item) => item.path === '/admin/user-roles')).toBe(false);
});

test('project-scoped role.view does not advertise or read global role governance lists', async ({ page }) => {
  const fixture = await installFixtures(page, {
    authenticated: true,
    adminPermissions: ['role.view', 'property.view'],
    adminGrants: {
      'role.view': [{ company_id: '33333333-3333-4333-8333-333333333333', project_id: '44444444-4444-4444-8444-444444444444' }],
      'property.view': [{ company_id: '33333333-3333-4333-8333-333333333333', project_id: '44444444-4444-4444-8444-444444444444' }],
    },
  });
  await page.goto('/');
  await expect(page).toHaveURL(/\/properties$/);
  await expect(page.getByRole('link', { name: 'Roles', exact: true })).toHaveCount(0);
  await page.goto('/user-roles');
  await expect(page.getByRole('heading', { name: 'No administrative access' })).toBeVisible();
  expect(fixture.requests.some((item) => item.path === '/admin/user-roles')).toBe(false);
});

test('global role.view keeps Roles and User Roles usable in the browser contract', async ({ page }) => {
  const fixture = await installFixtures(page, {
    authenticated: true,
    adminPermissions: ['role.view'],
    adminGrants: { 'role.view': [{ company_id: null, project_id: null }] },
  });
  await page.goto('/roles');
  await expect(page.getByRole('cell', { name: 'Fixture Operator', exact: true })).toBeVisible();
  await page.goto('/user-roles');
  await expect(page.getByRole('cell', { name: 'Fixture Operator', exact: true })).toBeVisible();
  expect(fixture.requests.some((item) => item.path === '/admin/roles')).toBe(true);
  expect(fixture.requests.some((item) => item.path === '/admin/user-roles')).toBe(true);
});

for (const path of ['/', '/dashboard'] as const) {
  test(`${path} keeps the dashboard usable without audit.view and makes no audit request`, async ({ page }) => {
    const fixture = await installFixtures(page, {
      authenticated: true,
      adminPermissions: ['company.view'],
      adminGrants: { 'company.view': [{ company_id: null, project_id: null }] },
    });
    await page.goto(path);
    await expect(path === '/' ? page.getByText('Command Center', { exact: true }).first() : page.getByText('Secure operations console.', { exact: true })).toBeVisible();
    await expect(page.locator('a[href="/audit-logs"]')).toHaveCount(0);
    expect(fixture.requests.some((item) => item.path === '/admin/audit-logs')).toBe(false);
  });

  test(`${path} exposes audit activity only when audit.view is granted`, async ({ page }) => {
    const fixture = await installFixtures(page, {
      authenticated: true,
      adminPermissions: ['company.view', 'audit.view'],
      adminGrants: {
        'company.view': [{ company_id: null, project_id: null }],
        'audit.view': [{ company_id: null, project_id: null }],
      },
    });
    await page.goto(path);
    await expect(page.locator('a[href="/audit-logs"]').first()).toBeAttached();
    if (path === '/') await expect(page.getByText('Recent Activity', { exact: true })).toBeVisible();
    expect(path === '/' ? fixture.requests.some((item) => item.path === '/admin/audit-logs') : true).toBe(true);
  });
}

test('Digital ID registry lets an eligible non-self global reviewer start a review without issuing an ID', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true, reviewCandidate: true });
  await page.goto('/rhc-digital-ids');
  const row = page.getByRole('row').filter({ hasText: fixture.candidate.email });
  await row.getByRole('button', { name: 'Review verification', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review business verification' })).toBeVisible();
  await expect(page.getByText('This approves business verification only.')).toBeVisible();
  expect(fixture.requests.filter((item) => item.method === 'POST')).toHaveLength(0);
});

for (const scenario of [
  ['self-review', 'Self-approval is not allowed.', (fixture: Awaited<ReturnType<typeof installFixtures>>) => { fixture.candidate.id = fixture.account.id; }],

  ['inactive candidate', 'An ACTIVE account is required.', (fixture: Awaited<ReturnType<typeof installFixtures>>) => { fixture.candidate.account_status = 'PENDING'; }],
  ['already verified candidate', 'Business verification is already approved.', (fixture: Awaited<ReturnType<typeof installFixtures>>) => { fixture.candidate.verification_status = 'VERIFIED'; }],
  ['invalid candidate state', 'This business status cannot be approved.', (fixture: Awaited<ReturnType<typeof installFixtures>>) => { fixture.candidate.verification_status = 'SUSPENDED'; }],
] as const) {
  test(`Digital ID registry blocks ${scenario[0]}`, async ({ page }) => {
    const fixture = await installFixtures(page, { authenticated: true, reviewCandidate: true });
    scenario[2](fixture);
    await page.goto('/rhc-digital-ids');
    const row = page.getByRole('row').filter({ hasText: fixture.candidate.email });
    await expect(row.getByText(scenario[1], { exact: true })).toBeVisible();
    if (scenario[0] === 'self-review' || scenario[0] === 'inactive candidate') {
      await expect(row.getByRole('button', { name: 'Review verification', exact: true })).toBeDisabled();
    } else {
      await expect(row.getByRole('button', { name: 'Review verification', exact: true })).toHaveCount(0);
    }
    expect(fixture.requests.filter((item) => item.method === 'POST')).toHaveLength(0);
  });
}

test('company/project-only user.manage never enables Digital ID review or administrative issuance', async ({ page }) => {
  const fixture = await installFixtures(page, {
    authenticated: true,
    reviewCandidate: true,
    adminMutationPermissions: ['user.manage'],
    adminMutationGrants: {
      'user.manage': [{ company_id: '33333333-3333-4333-8333-333333333333', project_id: '44444444-4444-4444-8444-444444444444' }],
    },
  });
  await page.goto('/rhc-digital-ids');
  const row = page.getByRole('row').filter({ hasText: fixture.candidate.email });
  await expect(row.getByText('No admin issuance action', { exact: true })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Review verification', exact: true })).toHaveCount(0);
  expect(fixture.requests.filter((item) => item.method === 'POST')).toHaveLength(0);
});

test('project-scoped company access cannot activate the company dashboard', async ({ page }) => {
  const fixture = await installFixtures(page, {
    authenticated: true,
    adminPermissions: ['company.view', 'property.view'],
    adminGrants: {
      'company.view': [{ company_id: '33333333-3333-4333-8333-333333333333', project_id: '44444444-4444-4444-8444-444444444444' }],
      'property.view': [{ company_id: '33333333-3333-4333-8333-333333333333', project_id: '44444444-4444-4444-8444-444444444444' }],
    },
  });
  await page.goto('/');
  await expect(page).toHaveURL(/\/properties$/);
  await expect(page.getByRole('link', { name: 'Companies', exact: true })).toHaveCount(0);
  expect(fixture.requests.some((item) => item.path === '/admin/dashboard')).toBe(false);
});

test('authenticated account with no admin read permission receives a no-access state', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true, adminPermissions: [] });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'No administrative access' })).toBeVisible();
  expect(fixture.requests.some((item) => item.path === '/admin/dashboard')).toBe(false);
  expect(fixture.requests.some((item) => item.path.startsWith('/admin/') && item.path !== '/admin/capabilities')).toBe(false);
});

test('company-scoped mutation grants only offer actions for the matching company', async ({ page }) => {
  const fixture = await installFixtures(page, {
    authenticated: true,
    adminMutationPermissions: ['company.manage'],
    adminMutationGrants: {
      'company.manage': [{ company_id: '33333333-3333-4333-8333-333333333333', project_id: null }],
    },
  });
  fixture.lists['/admin/companies'].push({
    ...fixture.company,
    id: '33333333-3333-4333-8333-333333333334',
    display_name: 'Other company',
  });
  await page.goto('/companies');
  await expect(page.getByRole('row').filter({ hasText: 'Fixture Company' }).getByRole('button', { name: 'Edit', exact: true })).toHaveCount(1);
  await expect(page.getByRole('row').filter({ hasText: 'Other company' }).getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
});

test('non-overlapping governance grants do not offer a multi-permission action', async ({ page }) => {
  await installFixtures(page, {
    authenticated: true,
    adminMutationPermissions: ['role.manage', 'permission.manage'],
    adminMutationGrants: {
      'role.manage': [{ company_id: null, project_id: null }],
      'permission.manage': [{ company_id: '33333333-3333-4333-8333-333333333333', project_id: null }],
    },
  });
  await page.goto('/roles');
  await expect(page.getByRole('button', { name: 'Manage permissions', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(1);
});

test('reservation actions use the nested property target and reject mismatched company scope', async ({ page }) => {
  const fixture = await installFixtures(page, {
    authenticated: true,
    adminPermissions: ['reservation.view'],
    adminMutationPermissions: ['reservation.manage', 'reservation.cancel'],
    adminMutationGrants: {
      'reservation.manage': [{ company_id: fixtureCompanyId(), project_id: null }],
      'reservation.cancel': [{ company_id: fixtureCompanyId(), project_id: null }],
    },
  });
  fixture.lists['/admin/reservations'] = [
    fixture.reservation,
    {
      ...fixture.reservation,
      id: '99999999-9999-4999-8999-999999999992',
      reservation_number: 'RSV-FIXTURE-2',
      property: {
        ...fixture.reservation.property,
        id: '55555555-5555-4555-8555-555555555556',
        project: {
          ...fixture.project,
          id: '44444444-4444-4444-8444-444444444445',
          company_id: '33333333-3333-4333-8333-333333333334',
          company: {
            ...fixture.company,
            id: '33333333-3333-4333-8333-333333333334',
            display_name: 'Other company',
          },
        },
      },
    },
  ];
  await page.goto('/reservations');
  const matching = page.getByRole('row').filter({ hasText: 'RSV-FIXTURE-1' });
  const mismatched = page.getByRole('row').filter({ hasText: 'RSV-FIXTURE-2' });
  await expect(matching.getByRole('button', { name: 'Confirm', exact: true })).toHaveCount(1);
  await expect(matching.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(1);
  await expect(mismatched.getByRole('button')).toHaveCount(0);
});

function fixtureCompanyId() {
  return '33333333-3333-4333-8333-333333333333';
}

test('property metadata editing does not require or submit status permission', async ({ page }) => {
  const fixture = await installFixtures(page, {
    authenticated: true,
    adminMutationPermissions: ['property.edit'],
    adminMutationGrants: {
      'property.edit': [{ company_id: '33333333-3333-4333-8333-333333333333', project_id: '44444444-4444-4444-8444-444444444444' }],
    },
  });
  await page.goto('/properties');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Status', { exact: true })).toHaveCount(0);
  await page.getByLabel('Area', { exact: true }).fill('54');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Changes saved.' })).toBeVisible();
  expect(fixture.requests.find((item) => item.method === 'PATCH')?.body).toEqual({ area: 54 });
});

test('a successful governance mutation invalidates capabilities for a follow-up request', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true });
  await page.goto('/companies');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Display name').fill('Capability refresh');
  const mutation = await deferNextRequest(page, `${apiUrl}/admin/companies/${fixture.company.id}`);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  expect((await mutation.started).method()).toBe('PATCH');
  // The mandatory preflight has finished; it must not count as the post-write refresh.
  const afterPreflight = fixture.requests.filter((item) => item.path === '/admin/capabilities').length;
  await expect(page.getByRole('status').filter({ hasText: 'Changes saved.' })).toHaveCount(0);
  await mutation.release();
  await expect(page.getByRole('status').filter({ hasText: 'Changes saved.' })).toBeVisible();
  await expect.poll(() => fixture.requests.filter((item) => item.path === '/admin/capabilities').length).toBeGreaterThan(afterPreflight);
});

test('permission removal before a pending submit sends no mutation request', async ({ page }) => {
  const fixture = await installFixtures(page, {
    authenticated: true,
    adminMutationPermissions: ['company.manage'],
    adminMutationGrants: { 'company.manage': [{ company_id: null, project_id: null }] },
  });
  await page.goto('/companies');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Display name').fill('Should not submit');
  fixture.options.adminMutationPermissions = [];
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'permissions changed' })).toBeVisible();
  expect(fixture.requests.some((item) => item.method === 'PATCH')).toBe(false);
});

test('capability refresh errors retain records but fail closed for mutation controls', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true });
  await page.goto('/companies');
  await expect(page.getByRole('cell', { name: 'Fixture Company', exact: true })).toBeVisible();
  await page.route(`${apiUrl}/admin/capabilities`, (route) =>
    route.fulfill({
      status: 503,
      json: { success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Synthetic capability refresh failure' } },
    }),
  );
  await page.getByRole('button', { name: 'Refresh records', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Fixture Company', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
  expect(fixture.requests.some((item) => item.method === 'PATCH')).toBe(false);
});

test('AUDITOR read access keeps records visible, hides mutations, and direct writes remain forbidden', async ({ page }) => {
  const fixture = await installFixtures(page, {
    authenticated: true,
    adminMutationPermissions: [],
    deny: [`/admin/companies/${'33333333-3333-4333-8333-333333333333'}`],
  });
  await page.goto('/companies');
  await expect(page.getByRole('cell', { name: 'Fixture Company', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create company', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  const responseStatus = await page.evaluate(async ({ url, id, bearer }) => {
    const response = await fetch(`${url}/admin/companies/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: 'Unauthorized write' }),
    });
    return response.status;
  }, { url: apiUrl, id: fixture.company.id, bearer: token });
  expect(responseStatus).toBe(403);
  expect(fixture.requests.filter((item) => item.method !== 'GET')).toHaveLength(1);
  expect(fixture.requests.at(-1)).toMatchObject({ method: 'PATCH', path: `/admin/companies/${fixture.company.id}` });
});

for (const [label, options] of [
  ['disabled account', { accountStatus: 'DISABLED' }],
  ['expired account', { expiredAccount: true }],
] as const) {
  test(`${label} cannot enter the Admin landing`, async ({ page }) => {
    const fixture = await installFixtures(page, { authenticated: true, ...options });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Account access' })).toBeVisible();
    expect(fixture.requests.some((item) => item.path === '/admin/dashboard')).toBe(false);
  });
}

test('capabilities API 403 shows a safe no-dashboard error state', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true, deny: ['/admin/capabilities'] });
  await page.goto('/');
  await expect(page.getByRole('alert').filter({ hasText: 'You do not have permission' })).toBeVisible();
  expect(fixture.requests.some((item) => item.path === '/admin/dashboard')).toBe(false);
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
  const submitted = deferred<void>();
  await page.route(
    `${apiUrl}/admin/users/${fixture.candidate.id}/verification/approve`,
    async (route) => {
      submissions++;
      submitted.resolve(undefined);
      await pending;
      await route.fallback();
    },
  );
  await page.goto('/users');
  await page.getByRole('button', { name: 'Review verification' }).click();
  await page.getByLabel('Review reference', { exact: true }).fill('REVIEW:42');
  await page.getByLabel('I completed the business review').check();
  await page.getByRole('button', { name: 'Confirm approval' }).click();
  await submitted.promise;
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

for (const workflow of mutationWorkflows) {
  test(`${workflow}: cancelling delayed capability preflight sends no write`, async ({ page }) => {
    const fixture = await installFixtures(page, { authenticated: true, reviewCandidate: true });
    const writes = observeAdminWrites(page);
    const action = await prepareMutation(page, fixture, workflow);
    const preflight = await deferNextRequest(page, `${apiUrl}/admin/capabilities`);
    await action.submit.click();
    await preflight.started;
    try {
      await expect(action.cancel).toBeEnabled();
      await action.cancel.click();
      await expect(action.card).toHaveCount(0);
    } finally {
      await preflight.release();
    }
    expect(writes).toHaveLength(0);
    await expect(appContent(page).getByRole('alert')).toHaveCount(0);
    await expect(appContent(page).getByText('Changes saved.', { exact: true })).toHaveCount(0);
  });

  test(`${workflow}: unmounting during delayed capability preflight sends no write`, async ({ page }) => {
    const fixture = await installFixtures(page, { authenticated: true, reviewCandidate: true });
    const writes = observeAdminWrites(page);
    const action = await prepareMutation(page, fixture, workflow);
    const preflight = await deferNextRequest(page, `${apiUrl}/admin/capabilities`);
    await action.submit.click();
    await preflight.started;
    try {
      // A client-side transition leaves the old fetch alive, unlike page.goto().
      await page.getByRole('link', { name: 'Permissions', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Permissions Workspace', exact: true })).toBeVisible();
      await expect(action.card).toHaveCount(0);
    } finally {
      await preflight.release();
    }
    expect(writes).toHaveLength(0);
    await expect(appContent(page).getByRole('alert')).toHaveCount(0);
  });

  test(`${workflow}: duplicate submissions share one preflight and one write`, async ({ page }) => {
    const fixture = await installFixtures(page, { authenticated: true, reviewCandidate: true });
    const writes = observeAdminWrites(page);
    const action = await prepareMutation(page, fixture, workflow);
    const preflight = await deferNextRequest(page, `${apiUrl}/admin/capabilities`);
    const write = await deferNextRequest(page, `${apiUrl}${action.path}`);
    await submitTwiceInOneTurn(action.submit);
    await preflight.started;
    expect(writes).toHaveLength(0);
    await expect(action.cancel).toBeEnabled();
    await preflight.release();
    await write.started;
    expect(preflight.count()).toBe(1);
    expect(writes).toHaveLength(1);
    expect(writes[0].postDataJSON()).toMatchObject(action.body);
    await expect(action.cancel).toBeDisabled();
    await write.release();
    await expect(action.card).toHaveCount(0);
    expect(write.count()).toBe(1);
    expect(writes).toHaveLength(1);
    await expect(appContent(page).getByRole('alert')).toHaveCount(0);
  });
}

test('management review: back to edit invalidates preflight and only the newly reviewed body is sent', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true });
  const writes = observeAdminWrites(page);
  const action = await prepareMutation(page, fixture, 'management review');
  const preflight = await deferNextRequest(page, `${apiUrl}/admin/capabilities`);
  await action.submit.click();
  await preflight.started;
  try {
    await action.card.getByRole('button', { name: 'Back to edit', exact: true }).click();
    await expect(action.card.getByRole('region', { name: 'Confirm reviewed changes' })).toHaveCount(0);
  } finally {
    await preflight.release();
  }
  expect(writes).toHaveLength(0);
  await expect(page.getByLabel('Project name')).toBeEnabled();
  await page.getByLabel('Project name').fill('Replacement project');
  await action.card.getByRole('button', { name: 'Review changes', exact: true }).click();
  await action.submit.click();
  await expect(appContent(page).getByRole('status').filter({ hasText: 'Changes saved.' })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].postDataJSON()).toEqual({ project_name: 'Replacement project' });
});

test('company editor: cancelled preflight cannot submit or close a replacement editor', async ({ page }) => {
  const fixture = await installFixtures(page, { authenticated: true });
  const writes = observeAdminWrites(page);
  const action = await prepareMutation(page, fixture, 'company editor');
  const preflight = await deferNextRequest(page, `${apiUrl}/admin/capabilities`);
  await action.submit.click();
  await preflight.started;
  try {
    await action.cancel.click();
    await expect(action.card).toHaveCount(0);
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByLabel('Display name').fill('Replacement company');
  } finally {
    await preflight.release();
  }
  await expect(page.getByLabel('Display name')).toHaveValue('Replacement company');
  await expect(action.submit).toBeEnabled();
  expect(writes).toHaveLength(0);
  await action.submit.click();
  await expect(appContent(page).getByRole('status').filter({ hasText: 'Changes saved.' })).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0].postDataJSON()).toEqual({ display_name: 'Replacement company' });
});

test('property.create alone saves the supplied AVAILABLE default in the authorized project', async ({ page }) => {
  const fixture = await installFixtures(page, {
    authenticated: true,
    adminMutationPermissions: ['property.create'],
    adminMutationGrants: {
      'property.create': [{ company_id: fixtureCompanyId(), project_id: '44444444-4444-4444-8444-444444444444' }],
    },
  });
  await page.goto('/properties');
  await page.getByRole('button', { name: 'Create property', exact: true }).click();
  await page.getByLabel('Project', { exact: true }).selectOption(fixture.project.id);
  await page.getByLabel('Property code').fill('CREATE-ONLY');
  const status = page.getByLabel('Status', { exact: true });
  await expect(status).toHaveValue('AVAILABLE');
  await expect(status.locator('option')).toHaveText(['AVAILABLE']);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'CREATE-ONLY', exact: true })).toBeVisible();
  const writes = fixture.requests.filter((item) => item.method === 'POST');
  expect(writes).toHaveLength(1);
  expect(writes[0].body).toMatchObject({ project_id: fixture.project.id, status: 'AVAILABLE' });
  await expect(appContent(page).getByRole('alert')).toHaveCount(0);
});

for (const mode of ['create', 'edit'] as const) {
  test(`property ${mode} blocks a changed status when fresh status permission is absent`, async ({ page }) => {
    const fixture = await installFixtures(page, { authenticated: true });
    const writes = observeAdminWrites(page);
    await page.goto('/properties');
    await page.getByRole('button', { name: mode === 'create' ? 'Create property' : 'Edit', exact: true }).click();
    if (mode === 'create') {
      await page.getByLabel('Project', { exact: true }).selectOption(fixture.project.id);
      await page.getByLabel('Property code').fill('BLOCKED-CREATE');
    }
    await page.getByLabel('Status', { exact: true }).selectOption(mode === 'create' ? 'HELD' : 'AVAILABLE');
    const preflight = await deferNextRequest(page, `${apiUrl}/admin/capabilities`);
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await preflight.started;
    fixture.options.adminMutationPermissions = [mode === 'create' ? 'property.create' : 'property.edit'];
    await preflight.release();
    await expect(appContent(page).getByRole('alert').filter({ hasText: 'permissions changed' })).toBeVisible();
    expect(writes).toHaveLength(0);
    await expect(appContent(page).getByText('Changes saved.', { exact: true })).toHaveCount(0);
  });
}

test('relationship scalar scope supports authorized metadata edits without nested property reads', async ({ page }) => {
  const fixture = await installFixtures(page, {
    authenticated: true,
    adminPermissions: ['customer_property.view'],
    adminMutationPermissions: ['customer_property.manage'],
    adminMutationGrants: {
      'customer_property.manage': [{ company_id: fixtureCompanyId(), project_id: '44444444-4444-4444-8444-444444444444' }],
    },
  });
  await page.goto('/customer-properties');
  await expect(page.getByRole('cell', { name: fixture.property.property_code, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Relationship', { exact: true }).selectOption('BUYER');
  await page.getByLabel('Effective from (UTC)', { exact: true }).fill('2026-09-01T00:00');
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm changes', exact: true }).click();
  await expect(appContent(page).getByRole('status').filter({ hasText: 'Changes saved.' })).toBeVisible();
  const writes = fixture.requests.filter((item) => item.method === 'PATCH');
  expect(writes).toHaveLength(1);
  expect(writes[0].body).toEqual({ relationship_type: 'BUYER', effective_from: '2026-09-01T00:00:00.000Z' });
  expect(fixture.requests.some((item) => ['/admin/properties', '/admin/projects', '/admin/customers'].includes(item.path))).toBe(false);
});
