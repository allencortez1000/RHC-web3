import { expect, test } from '@playwright/test';
import { installFixtures } from './fixtures';

const identityFields = [
  ['first_name', 'First name', 'Alex'],
  ['middle_name', 'Middle name', 'Taylor'],
  ['last_name', 'Last name', 'Rivera'],
  ['suffix', 'Suffix', 'Jr'],
  ['birth_date', 'Birth date', '1990-04-15'],
  ['nationality', 'Nationality', 'Filipino'],
  ['address_line', 'Address', '42 Example Street'],
  ['barangay', 'Barangay', 'Example Barangay'],
  ['city', 'City', 'Manila'],
  ['province', 'Province', 'Metro Manila'],
  ['postal_code', 'Postal code', '1000'],
  ['country', 'Country', 'Philippines'],
] as const;
const identity = Object.fromEntries(identityFields.map(([key, , value]) => [key, value]));
const mobile = '+639123456789';
const patches = (fixture: Awaited<ReturnType<typeof installFixtures>>) =>
  fixture.requests.filter((item) => item.method === 'PATCH' && item.path === '/me');

for (const reason of ['user verification', 'profile verification', 'RHC ID', 'issued timestamp']) {
  test(`identity is read-only and PATCH is contact-only for ${reason}`, async ({ page }) => {
    const fixture = await installFixtures(page, { authenticated: true });
    Object.assign(fixture.profile, identity, { mobile_number: mobile });
    if (reason === 'user verification') fixture.account.verification_status = 'VERIFIED';
    if (reason === 'profile verification') fixture.profile.verification_status = 'VERIFIED';
    if (reason === 'RHC ID') fixture.profile.rhc_id = 'RHC-2026-00000042';
    if (reason === 'issued timestamp') {
      fixture.account.verification_status = 'REJECTED';
      fixture.profile.verification_status = 'REJECTED';
      fixture.profile.rhc_id_issued_at = '2026-01-01T00:00:00.000Z';
    }
    // The API returns timestamps; the date input must retain its date-only representation.
    fixture.profile.birth_date = '1990-04-15T00:00:00.000Z';
    await page.goto('/profile');
    const notice = page.getByText(/Your identity details are read-only/);
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('pending administrative review');
    for (const [, label, value] of identityFields) {
      const input = page.getByLabel(label, { exact: true });
      await expect(input).toBeVisible();
      await expect(input).toHaveValue(value);
      await expect(input).not.toBeEditable();
      await expect(input).toHaveAttribute('readonly', '');
      await expect(input).toHaveAccessibleDescription(/pending administrative review/);
    }
    await expect(page.getByLabel('Mobile number', { exact: true })).toHaveValue(mobile);
    await page.getByLabel('Mobile number', { exact: true }).fill('+639987654321');
    // Even a DOM-modified read-only input must never be serialized into the PATCH.
    await page.getByLabel('First name', { exact: true }).evaluate((input: HTMLInputElement) => {
      input.value = 'Not an approved change';
    });
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Profile saved.' })).toBeVisible();
    expect(patches(fixture).map((item) => item.body)).toEqual([{ mobile_number: '+639987654321' }]);
    expect(fixture.profile.first_name).toBe('Alex');
    await page.reload();
    await expect(page.getByLabel('First name', { exact: true })).toHaveValue('Alex');
    await expect(page.getByLabel('Mobile number', { exact: true })).toHaveValue('+639987654321');
  });
}

for (const status of ['UNVERIFIED', 'PENDING', 'REJECTED']) {
  test(`${status} profiles without approval or issuance retain full editing`, async ({ page }) => {
    const fixture = await installFixtures(page, { authenticated: true });
    fixture.account.verification_status = status;
    Object.assign(fixture.profile, { verification_status: status, mobile_number: mobile });
    await page.goto('/profile');
    await expect(page.getByText(/Your identity details are read-only/)).toHaveCount(0);
    for (const [, label, value] of identityFields) {
      const input = page.getByLabel(label, { exact: true });
      await expect(input).toBeEditable();
      await input.fill(value);
    }
    await page.getByLabel('First name', { exact: true }).fill('Alexandra');
    await page.getByLabel('Mobile number', { exact: true }).fill('+639987654321');
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Profile saved.' })).toBeVisible();
    expect(patches(fixture).map((item) => item.body)).toEqual([
      { ...identity, first_name: 'Alexandra', mobile_number: '+639987654321' },
    ]);
    await page.reload();
    await expect(page.getByLabel('First name', { exact: true })).toHaveValue('Alexandra');
  });
}

test('approved incomplete identities allow clearing contact metadata without required-name errors', async ({
  page,
}) => {
  const fixture = await installFixtures(page, { authenticated: true, businessVerified: true });
  Object.assign(fixture.profile, { first_name: null, last_name: null, mobile_number: mobile });
  await page.goto('/profile');
  const input = page.getByLabel('Mobile number', { exact: true });
  await input.fill('not-a-phone');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  expect(
    await input.evaluate((element: HTMLInputElement) => element.validity.patternMismatch),
  ).toBe(true);
  expect(patches(fixture)).toHaveLength(0);
  await input.fill('');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Profile saved.' })).toBeVisible();
  expect(patches(fixture).map((item) => item.body)).toEqual([{ mobile_number: null }]);
});

test('pre-approval blank optional fields remain nullable and names remain required', async ({
  page,
}) => {
  const fixture = await installFixtures(page, { authenticated: true });
  await page.goto('/profile');
  await page.getByLabel('First name', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  expect(patches(fixture)).toHaveLength(0);
  await page.getByLabel('First name', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'First and last names are required.' }),
  ).toBeVisible();
  expect(patches(fixture)).toHaveLength(0);
  await page.getByLabel('First name', { exact: true }).fill('  Alex  ');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Profile saved.' })).toBeVisible();
  expect(patches(fixture)[0].body).toEqual({
    ...Object.fromEntries(identityFields.map(([key]) => [key, null])),
    first_name: 'Alex',
    last_name: 'Rivera',
    country: 'Philippines',
    mobile_number: null,
  });
});

test('approval while editing is denied by the API and locks identity after reload', async ({
  page,
}) => {
  const fixture = await installFixtures(page, { authenticated: true });
  await page.goto('/profile');
  await page.getByLabel('First name', { exact: true }).fill('Unapproved');
  fixture.account.verification_status = 'VERIFIED';
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'You do not have permission' }),
  ).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Profile saved.' })).toHaveCount(0);
  expect(fixture.profile.first_name).toBe('Alex');
  await page.reload();
  await expect(page.getByLabel('First name', { exact: true })).not.toBeEditable();
  await expect(page.getByLabel('First name', { exact: true })).toHaveValue('Alex');
  await page.getByLabel('Mobile number', { exact: true }).fill(mobile);
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Profile saved.' })).toBeVisible();
  expect(patches(fixture).map((item) => item.body)).toHaveLength(2);
  expect(patches(fixture)[1].body).toEqual({ mobile_number: mobile });
});
