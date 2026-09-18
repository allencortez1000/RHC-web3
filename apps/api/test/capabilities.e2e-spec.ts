import request from 'supertest';
import { createHarness, ids, Harness } from './api-harness';

describe('authenticated admin capabilities', () => {
  let h: Harness;

  beforeEach(async () => { h = await createHarness(); });
  afterEach(async () => { await h?.close(); });

  function get() {
    return request(h.app.getHttpServer()).get('/api/v1/admin/capabilities').set('Authorization', `Bearer ${h.token}`);
  }

  it('returns an empty capability set for an authenticated customer without querying dashboard data', async () => {
    const response = await get().expect(200);

    expect(response.body.data).toEqual({ permissions: [], grants: {} });
    expect(h.prisma.userRole.findMany).toHaveBeenCalled();
    expect(h.prisma.company.count).not.toHaveBeenCalled();
  });

  it('returns only effective module permissions and bounded scopes for the caller', async () => {
    h.grant('company.view', ids.companyA);
    h.grant('property.view', ids.companyA, ids.projectA);
    h.grant('customer.view', ids.companyB);

    const response = await get().expect(200);

    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.data.permissions).toEqual(['company.view', 'customer.view', 'property.view']);
    expect(response.body.data.grants).toEqual({
      'company.view': [{ company_id: ids.companyA, project_id: null }],
      'customer.view': [{ company_id: ids.companyB, project_id: null }],
      'property.view': [{ company_id: ids.companyA, project_id: ids.projectA }],
    });
    expect(JSON.stringify(response.body)).not.toMatch(/customer@example|10000000|Bearer|email|supabase/i);
  });

  it('does not report expired or customer-role grants as effective administrative access', async () => {
    h.grant('project.view', ids.companyA);
    h.grants.get('project.view')![0].expires_at = new Date(0);
    expect((await get().expect(200)).body.data.permissions).toEqual([]);

    h.grant('company.view', ids.companyA);
    (h.grants.get('company.view')![0] as any).role.code = 'CUSTOMER';
    expect((await get().expect(200)).body.data.permissions).toEqual([]);
  });

  it('continues to deny disabled accounts before resolving capabilities', async () => {
    h.user.account_status = 'DISABLED';

    await get().expect(401);
    expect(h.prisma.userRole.findMany).not.toHaveBeenCalled();
  });
});
