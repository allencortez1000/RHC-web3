import { test, expect, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthAdapter } from '@rhc/ui';
import { authUrl, installFixtures, token } from './fixtures';

const storageKey = `sb-${new URL(authUrl).hostname.split('.')[0]}-auth-token`;
const implicit = `#access_token=${token}&refresh_token=unsolicited-refresh-token&type=recovery`;
const rejectedLinks = [
  implicit,
  '?token_hash=unsolicited&type=signup',
  '?token_hash=unsolicited&type=recovery',
  '?token_hash=unsolicited&type=email',
  `?code=synthetic-confirmation${implicit}`,
  '?code=synthetic-confirmation&token_hash=unsolicited&type=signup',
  '',
];
const readSession = (page: Page) => page.evaluate((key) => localStorage.getItem(key), storageKey);

async function requestRecovery(page: Page) {
  await page.goto('/forgot-password');
  await page.getByLabel('Email address').fill('alex@example.test');
  await page.getByRole('button', { name: 'Send recovery link' }).click();
  await expect(page.getByRole('status')).toContainText('If an account exists');
}

// Register the same security contract against each app's own adapter and rendered pages.
export function authCallbackTests(adapter: AuthAdapter, client: SupabaseClient | null) {
  test('unsupported callbacks never call setSession, verifyOtp, or exchange a code', async () => {
    expect(client, 'Run with the synthetic public Supabase fixture environment').not.toBeNull();
    const auth = client!.auth;
    const methods = ['setSession', 'verifyOtp', 'exchangeCodeForSession', 'getUser'] as const;
    const originals = methods.map((method) => auth[method]);
    const calls: string[] = [];
    try {
      for (const method of methods) {
        auth[method] = async () => {
          calls.push(method);
          throw new Error(`Unexpected ${method}`);
        };
      }
      for (const path of ['/auth/confirm', '/reset-password']) {
        for (const suffix of [
          ...rejectedLinks,
          '#access_token=partial',
          '#refresh_token=partial',
          '#token_hash=unsolicited&type=recovery',
          '?access_token=unsolicited&refresh_token=unsolicited',
          '?token_hash=',
          '?code=',
          '?code=one&code=two',
        ]) {
          await expect(adapter.confirm(`http://localhost${path}${suffix}`)).rejects.toThrow(
            /Request a new email link in this browser/,
          );
        }
      }
      expect(calls).toEqual([]);
    } finally {
      methods.forEach((method, index) => Object.assign(auth, { [method]: originals[index] }));
    }
  });

  for (const authenticated of [false, true]) {
    for (const path of ['/auth/confirm', '/reset-password']) {
      test(`${path} rejects unsolicited links without changing ${authenticated ? 'an existing' : 'an anonymous'} session`, async ({ page }) => {
        const fixture = await installFixtures(page, { authenticated });
        await page.goto('/login');
        const before = await readSession(page);
        for (const suffix of rejectedLinks) {
          await page.goto(`${path}${suffix}`);
          await expect(page.locator('form').getByRole('alert')).toContainText('Request a new email link in this browser');
          await expect(page).toHaveURL(new RegExp(`${path}$`));
          await expect(page.getByRole('link', { name: 'Request a new link' })).toBeVisible();
          await expect(page.getByRole('link', { name: 'Continue to account' })).toHaveCount(0);
          if (path === '/reset-password') {
            await expect(page.getByRole('button', { name: 'Update password' })).toBeDisabled();
            // The submit handler must also fail closed, not just the disabled button.
            await page.locator('form').dispatchEvent('submit');
          }
          expect(await readSession(page)).toBe(before);
        }
        expect(fixture.authRequests).toEqual([]);
        expect(fixture.requests).toEqual([]);
      });

      for (const failure of ['missing verifier', 'wrong verifier', 'expired code']) {
        test(`${path} rejects PKCE with ${failure} (${authenticated ? 'signed in' : 'anonymous'})`, async ({ page }) => {
          const fixture = await installFixtures(page, { authenticated });
          if (failure === 'missing verifier') await page.goto('/login');
          else await requestRecovery(page);
          if (failure === 'wrong verifier') {
            await page.evaluate(
              (key) => localStorage.setItem(key, JSON.stringify('wrong-browser-verifier/recovery')),
              `${storageKey}-code-verifier`,
            );
          }
          const before = await readSession(page);
          const code = failure === 'expired code' ? 'expired-code' : 'synthetic-recovery';
          await page.goto(`${path}?code=${code}`);
          await expect(page.locator('form').getByRole('alert')).toBeVisible();
          await expect(page.getByRole('link', { name: 'Request a new link' })).toBeVisible();
          await expect(page).toHaveURL(new RegExp(`${path}$`));
          await expect(page.getByRole('link', { name: 'Continue to account' })).toHaveCount(0);
          if (path === '/reset-password')
            await expect(page.getByRole('button', { name: 'Update password' })).toBeDisabled();
          expect(await readSession(page)).toBe(before);
          expect(fixture.authRequests.filter((item) => ['/verify', '/user'].includes(item.path))).toEqual([]);
          expect(fixture.requests).toEqual([]);
          if (failure === 'missing verifier') expect(fixture.authRequests).toEqual([]);
          else expect(fixture.authRequests.filter((item) => item.path === '/token')).toHaveLength(1);
        });
      }
    }
  }

  test('browser-bound PKCE recovery updates the password, logs out, and rejects replay', async ({ page }) => {
    const fixture = await installFixtures(page);
    await requestRecovery(page);
    const verifier = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!) as string,
      `${storageKey}-code-verifier`,
    );
    expect(verifier).toMatch(/\/recovery$/);
    await page.goto('/reset-password?code=synthetic-recovery');
    await expect(page.getByRole('button', { name: 'Update password' })).toBeEnabled();
    await expect(page).toHaveURL(/\/reset-password$/);
    expect(fixture.authRequests.find((item) => item.path === '/token')?.body).toEqual({
      auth_code: 'synthetic-recovery',
      code_verifier: verifier.split('/')[0],
    });
    await page.getByLabel('New password').fill('Replacement-password-42!');
    await page.getByLabel('Confirm password').fill('Replacement-password-42!');
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page.getByRole('status')).toContainText('Password updated');
    expect(fixture.authRequests.find((item) => item.path === '/user' && item.method === 'PUT')?.body)
      .toMatchObject({ password: 'Replacement-password-42!' });
    expect(fixture.authRequests.some((item) => item.path === '/logout')).toBe(true);
    expect(await readSession(page)).toBeNull();
    await page.goto('/reset-password?code=synthetic-recovery');
    await expect(page.locator('form').getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update password' })).toBeDisabled();
    expect(await readSession(page)).toBeNull();
    expect(fixture.authRequests.filter((item) => item.path === '/token')).toHaveLength(1);
    await page.goto('/auth/confirm?error_description=Email%20link%20expired');
    await expect(page.locator('form').getByRole('alert')).toContainText('Email link expired');
    await expect(page.getByRole('link', { name: 'Request a new link' })).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/confirm$/);
  });

  test('resend confirmation uses a browser-bound PKCE code and scrubs history', async ({ page }) => {
    const fixture = await installFixtures(page);
    await page.goto('/verification');
    await page.getByLabel('Email address').fill('alex@example.test');
    await page.getByRole('button', { name: 'Resend confirmation' }).click();
    await expect(page.getByRole('status')).toContainText('Check your email');
    await page.goto('/auth/confirm?code=synthetic-confirmation');
    await expect(page.getByRole('status')).toContainText('Email confirmed');
    await expect(page).toHaveURL(/\/auth\/confirm$/);
    await page.getByRole('link', { name: 'Continue to account' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(fixture.authRequests.filter((item) => item.path === '/token')).toHaveLength(1);
    expect(fixture.authRequests.some((item) => item.path === '/verify')).toBe(false);
    expect(fixture.requests.some((item) => item.path === '/auth/session')).toBe(true);
    expect(fixture.requests.every((item) => !item.path.includes('password'))).toBe(true);
  });
}
