import { expect, test, type Page } from './offline-test';
import { apiUrl, installFixtures, signIn, token } from './fixtures';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function card(page: Page, title: string) {
  return page.locator('.rhc-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}

for (const pendingPath of ['/me', '/me/rhc-id']) {
  test(`Digital ID waits for ${pendingPath} before claiming unissued or offering issuance`, async ({ page }) => {
    const fixture = await installFixtures(page, { authenticated: true, businessVerified: true });
    fixture.profile.rhc_id = null;
    const gate = deferred();
    let reads = 0;
    await page.route(apiUrl + pendingPath, async (route) => {
      reads += 1;
      await gate.promise;
      await route.fulfill({ json: { success: true, data: pendingPath === '/me'
        ? { user: fixture.account, profile: fixture.profile }
        : { rhc_id: null, rhc_id_issued_at: null } } });
    });
    try {
      await page.goto('/digital-id');
      await expect.poll(() => reads).toBe(1);
      await expect(card(page, 'Verification Reference')).toContainText('Loading…');
      await expect(page.getByText(/^(Not issued|Pending issuance)$/)).toHaveCount(0);
      await expect(card(page, 'Eligibility Checklist')).toContainText('Loading eligibility…');
      await expect(page.getByRole('button', { name: 'Issue RHC Digital ID', exact: true })).toHaveCount(0);
      expect(fixture.requests.filter((request) => request.method === 'POST')).toHaveLength(0);
    } finally { gate.resolve(); }
    await expect(card(page, 'Verification Reference')).toContainText('Not issued');
    await expect(page.getByRole('button', { name: 'Issue RHC Digital ID', exact: true })).toBeEnabled();
    await expect(card(page, 'Eligibility Checklist')).toContainText('RHC ID issued');
  });

  test(`Digital ID failed ${pendingPath} stays unknown until a successful retry`, async ({ page }) => {
    const fixture = await installFixtures(page, { authenticated: true, businessVerified: true });
    fixture.profile.rhc_id = null;
    let failed = true;
    await page.route(apiUrl + pendingPath, (route) => route.fulfill(failed
      ? { status: 503, json: { success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' }, meta: { request_id: 'synthetic-id-failure' } } }
      : { json: { success: true, data: pendingPath === '/me'
        ? { user: fixture.account, profile: fixture.profile }
        : { rhc_id: null, rhc_id_issued_at: null } } }));
    await page.goto('/digital-id');
    await expect(page.getByRole('alert').filter({ hasText: 'Service temporarily unavailable' })).toBeVisible();
    await expect(card(page, 'Verification Reference')).toContainText('Unavailable');
    await expect(page.getByText(/^(Not issued|Pending issuance)$/)).toHaveCount(0);
    await expect(card(page, 'Eligibility Checklist')).toContainText('Eligibility unavailable');
    await expect(page.getByRole('button', { name: 'Issue RHC Digital ID', exact: true })).toHaveCount(0);
    failed = false;
    await page.getByRole('button', { name: 'Refresh status', exact: true }).click();
    await expect(card(page, 'Verification Reference')).toContainText('Not issued');
    await expect(page.getByRole('button', { name: 'Issue RHC Digital ID', exact: true })).toBeEnabled();
    expect(fixture.requests.filter((request) => request.method === 'POST')).toHaveLength(0);
  });
}

test('issued Digital ID without a public reference never promises a QR after issuance', async ({ page }) => {
  await installFixtures(page, { authenticated: true, businessVerified: true });
  await page.goto('/digital-id');
  await expect(card(page, 'Verification Reference').getByText('Issued', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Non-scannable verification reference placeholder' })).toBeVisible();
  await expect(page.getByText('Verification QR appears after credential issuance', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Public verification unavailable', exact: true })).toBeDisabled();
  await expect(page.getByRole('img', { name: 'QR code for the privacy-safe RHC verification page' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open public verification', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Issue RHC Digital ID', exact: true })).toHaveCount(0);
});

async function reservationFixtures(page: Page, options: { failure?: number; gate?: ReturnType<typeof deferred> } = {}) {
  const fixture = await installFixtures(page, { authenticated: true });
  const ownerId = fixture.account.id;
  fixture.property.status = 'AVAILABLE';
  fixture.lists['/me/properties'] = [];
  const reservation = {
    id: '99999999-9999-4999-8999-999999999992',
    reservation_number: 'RSV-SYNTHETIC-PREP-42',
    status: 'PENDING',
    expires_at: '2026-12-01T00:00:00.000Z',
    created_at: '2026-10-08T00:00:00.000Z',
    updated_at: '2026-10-08T00:00:00.000Z',
    property: {
      id: fixture.property.id, property_code: fixture.property.property_code, status: 'HELD',
      project: { project_name: fixture.project.project_name, company: { display_name: fixture.company.display_name } },
    },
  };
  const state = { posts: 0, settled: 0, created: false, listReads: 0, detailNotFound: 0 };
  await page.route(apiUrl + '/properties?status=AVAILABLE&take=200', (route) => route.fulfill({ json: { success: true, data: state.created ? [] : [fixture.property] } }));
  await page.route(apiUrl + '/properties/' + fixture.property.id, (route) => {
    if (state.created) {
      state.detailNotFound += 1;
      return route.fulfill({ status: 404, json: { success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } } });
    }
    return route.fulfill({ json: { success: true, data: fixture.property } });
  });
  await page.route(apiUrl + '/me/reservations', async (route) => {
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
    if (route.request().method() === 'GET') {
      state.listReads += 1;
      return route.fulfill({ json: { success: true, data: state.created && fixture.account.id === ownerId ? [reservation] : [] } });
    }
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ property_id: fixture.property.id });
    state.posts += 1;
    if (options.gate) await options.gate.promise;
    try {
      if (options.failure) {
        const code = options.failure === 403 ? 'FORBIDDEN' : options.failure === 409 ? 'CONFLICT' : 'SERVICE_UNAVAILABLE';
        const message = options.failure === 403 ? 'Access denied' : options.failure === 409 ? 'Resource conflict' : 'Service temporarily unavailable';
        await route.fulfill({ status: options.failure, json: { success: false, error: { code, message }, meta: { request_id: 'synthetic-reservation-failure' } } });
      } else {
        state.created = true;
        await route.fulfill({ status: 201, json: { success: true, data: reservation } });
      }
    } finally { state.settled += 1; }
  });
  return { fixture, reservation, state };
}

test('successful detail reservation opens durable server-owned confirmation and clears it on account change', async ({ page }) => {
  const { fixture, reservation, state } = await reservationFixtures(page);
  await page.goto('/properties/' + fixture.property.id);
  await page.getByRole('button', { name: 'Reserve unit', exact: true }).click();
  await expect(page).toHaveURL(/\/reservations$/);
  await expect(card(page, 'My Reservations').getByText(reservation.reservation_number, { exact: true })).toBeVisible();
  await expect(card(page, 'My Reservations')).toContainText(fixture.property.property_code);
  await expect(card(page, 'My Reservations')).toContainText('PENDING');
  expect(state.posts).toBe(1);
  expect(state.listReads).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: /^(Reserve unit|Create reservation)$/ })).toHaveCount(0);
  await page.reload();
  await expect(card(page, 'My Reservations').getByText(reservation.reservation_number, { exact: true })).toBeVisible();
  await page.goto('/properties/' + fixture.property.id);
  await expect(page.getByRole('alert').filter({ hasText: 'Resource not found' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reserve unit', exact: true })).toHaveCount(0);
  expect(state.detailNotFound).toBeGreaterThan(0);
  expect(state.posts).toBe(1);
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  // The next authenticated application account owns no reservation in this fixture.
  fixture.account.id = '22222222-2222-4222-8222-222222222223';
  fixture.account.email = 'other-customer@example.test';
  fixture.profile.first_name = 'Other';
  await signIn(page);
  await page.goto('/reservations');
  await expect(card(page, 'My Reservations')).toContainText('No reservations');
  await expect(page.getByText(reservation.reservation_number, { exact: true })).toHaveCount(0);
  expect(state.posts).toBe(1);
});

for (const status of [403, 409, 503]) {
  test(`detail reservation ${status} never navigates or fabricates confirmation`, async ({ page }) => {
    const { fixture, reservation, state } = await reservationFixtures(page, { failure: status });
    await page.goto('/properties/' + fixture.property.id);
    await page.getByRole('button', { name: 'Reserve unit', exact: true }).click();
    await expect(card(page, 'Reservation Request').getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(new RegExp('/properties/' + fixture.property.id + '$'));
    await expect(page.getByText(reservation.reservation_number, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reserve unit', exact: true })).toBeEnabled();
    expect(state.posts).toBe(1);
    expect(state.created).toBe(false);
    expect(state.listReads).toBe(0);
  });
}

test('sign-out invalidates an in-flight reservation without late confirmation or navigation', async ({ page }) => {
  const gate = deferred();
  const { fixture, reservation, state } = await reservationFixtures(page, { gate });
  try {
    await page.goto('/properties/' + fixture.property.id);
    await page.getByRole('button', { name: 'Reserve unit', exact: true }).click();
    await expect.poll(() => state.posts).toBe(1);
    await expect(page.getByRole('button', { name: 'Creating…', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
    await expect(page).toHaveURL(/\/login$/);
  } finally { gate.resolve(); }
  await expect.poll(() => state.settled).toBe(1);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(reservation.reservation_number, { exact: true })).toHaveCount(0);
  expect(state.listReads).toBe(0);
});
