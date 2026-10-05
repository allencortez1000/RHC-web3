import { expect, test } from './offline-test';
import { apiUrl, installFixtures, token } from '../../customer-web/tests/fixtures';

for (const globalAllowed of [false, true]) {
  test('thirdweb checks effective grants for mixed scope account: global=' + globalAllowed, async ({ page }) => {
    const companyId = '33333333-3333-4333-8333-333333333333';
    const fixture = await installFixtures(page, {
      authenticated: true,
      adminPermissions: ['integration.view'],
      adminMutationPermissions: [],
      adminGrants: { 'integration.view': [
        { company_id: companyId, project_id: null },
        ...(globalAllowed ? [{ company_id: null, project_id: null }] : []),
      ] },
    });
    await page.route(apiUrl + '/auth/session', (route) => route.fulfill({ json: {
      success: true, data: { authenticated: true, user: {
        ...fixture.account, permissions: ['integration.view'],
        company_ids: [companyId], project_ids: [],
      } },
    } }));
    let reads = 0;
    await page.route(apiUrl + '/admin/integrations/thirdweb', (route) => {
      reads += 1;
      expect(route.request().method()).toBe('GET');
      expect(route.request().headers().authorization).toBe('Bearer ' + token);
      return route.fulfill({ status: 503, json: { message: 'Intercepted provider unavailable' } });
    });
    await page.goto('/integrations');
    if (globalAllowed) {
      await expect(page.getByRole('heading', { name: 'Thirdweb read-only integration' })).toBeVisible();
      await expect(page.getByRole('alert').filter({ hasText: 'Intercepted provider unavailable' })).toBeVisible();
      expect(reads).toBeGreaterThan(0);
    } else {
      await expect(page.getByText('Global integration.view access is required', { exact: false })).toBeVisible();
      expect(reads).toBe(0);
    }
  });
}
