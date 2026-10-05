import { expect, test } from './offline-test';
import { apiUrl, installFixtures } from '../../customer-web/tests/fixtures';

for (const path of ['/', '/dashboard'] as const) {
  for (const auditAllowed of [false, true]) {
    test(`${path} keeps dashboard access with audit visibility ${auditAllowed ? 'enabled' : 'disabled'}`, async ({ page }) => {
      const permissions = auditAllowed
        ? ['company.view', 'audit.view']
        : ['company.view', 'customer.view', 'reservation.view'];
      const fixture = await installFixtures(page, {
        authenticated: true,
        adminPermissions: permissions,
        adminMutationPermissions: [],
      });

      if (!auditAllowed) {
        // Permission membership alone must not expose modules the API reports unusable.
        await page.route(`${apiUrl}/admin/capabilities`, (route) => {
          if (route.request().method() !== 'GET') return route.fallback();
          return route.fulfill({
            headers: { 'access-control-allow-origin': '*' },
            json: {
              success: true,
              data: {
                permissions,
                grants: Object.fromEntries(permissions.map((permission) => [permission, []])),
                mutation_permissions: [],
                mutation_grants: {},
                modules: [
                  { path: '/', permission: 'company.view', usable: true },
                  { path: '/companies', permission: 'company.view', usable: true },
                  { path: '/customers', permission: 'customer.view', usable: false },
                  { path: '/rhc-digital-ids', permission: 'customer.view', usable: false },
                  { path: '/reservations', permission: 'reservation.view', usable: false },
                  { path: '/audit-logs', permission: 'audit.view', usable: false },
                ],
              },
            },
          });
        });
      }

      await page.goto(path);
      await expect(page.getByRole('heading', {
        level: 1,
        name: path === '/' ? 'Command Center' : 'Secure operations console.',
        exact: true,
      })).toBeVisible();
      await expect(page).toHaveURL(new URL(path, page.url()).href);
      await expect(page.getByText('Total users', { exact: true }).locator('..').locator('.rhc-value')).toHaveText('7');
      if (path === '/') {
        await expect(page.getByText('Available units', { exact: true }).locator('..').locator('.rhc-value')).toHaveText('2');
      }

      const operationalCard = page.locator('section.rhc-card').filter({
        has: page.getByRole('heading', {
          level: 2,
          name: path === '/' ? 'Operational Workspaces' : 'Operational Modules',
          exact: true,
        }),
      });
      const expectedLinks = auditAllowed ? ['/companies', '/audit-logs'] : ['/companies'];
      await expect(operationalCard.getByRole('link')).toHaveCount(expectedLinks.length);
      expect(await operationalCard.locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(expectedLinks);

      const activity = page.getByRole('heading', { level: 2, name: 'Recent Activity', exact: true });
      if (auditAllowed) {
        await expect(operationalCard.locator('a[href="/audit-logs"]')).toBeVisible();
        if (path === '/') {
          await expect(activity).toBeVisible();
          await expect(page.locator('section.rhc-card').filter({ has: activity }).getByText('company.update', { exact: true })).toBeVisible();
        } else {
          await expect(activity).toHaveCount(0);
        }
      } else {
        await expect(page.locator('a[href="/audit-logs"], a[href="/customers"], a[href="/rhc-digital-ids"], a[href="/reservations"]')).toHaveCount(0);
        await expect(activity).toHaveCount(0);
      }

      // Check request absence only after the dashboard's mounted resources have settled.
      await expect(page.getByRole('status').filter({ hasText: 'Loading records…' })).toHaveCount(0);
      // The framework's route-announcer alert lives outside the application content.
      await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
      expect(fixture.requests.some((request) => request.path === '/admin/dashboard')).toBe(true);
      const auditRequests = fixture.requests.filter((request) => request.path === '/admin/audit-logs');
      if (auditAllowed && path === '/') {
        expect(auditRequests.some((request) => request.method === 'GET')).toBe(true);
      } else {
        expect(auditRequests).toHaveLength(0);
      }
    });
  }
}
