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

    expect(response.body.data.permissions).toEqual([]);
    expect(response.body.data.grants).toEqual({});
    expect(response.body.data.mutation_permissions).toEqual([]);
    expect(response.body.data.mutation_grants).toEqual({});
    expect(response.body.data.modules).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/', permission: 'company.view', usable: false }),
      expect.objectContaining({ path: '/companies', permission: 'company.view', usable: false }),
    ]));
    expect(response.body.data.modules.every((module: { usable: boolean }) => !module.usable)).toBe(true);
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
    expect(response.body.data.mutation_permissions).toEqual([]);
    expect(response.body.data.modules).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/', permission: 'company.view', usable: true }),
      expect.objectContaining({ path: '/companies', permission: 'company.view', usable: true }),
      expect.objectContaining({ path: '/customers', permission: 'customer.view', usable: true }),
      expect.objectContaining({ path: '/properties', permission: 'property.view', usable: true }),
    ]));
    expect(response.body.data.modules.find((module: { path: string }) => module.path === '/projects')?.usable).toBe(false);
    expect(JSON.stringify(response.body)).not.toMatch(/customer@example|10000000|Bearer|email|supabase/i);
  });

  it('does not treat read permission as mutation authority', async () => {
    h.grant('company.view', ids.companyA);
    let response = await get().expect(200);
    expect(response.body.data.permissions).toEqual(['company.view']);
    expect(response.body.data.mutation_permissions).toEqual([]);

    h.grant('company.manage', ids.companyA);
    response = await get().expect(200);
    expect(response.body.data.mutation_permissions).toEqual(['company.manage']);
    expect(response.body.data.mutation_grants).toEqual({ 'company.manage': [{ company_id: ids.companyA, project_id: null }] });
  });

  it('keeps global role viewers aligned with both role endpoints', async () => {
    h.grant('role.view');
    const response = await get().expect(200);

    expect(response.body.data.modules).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/roles', usable: true }),
      expect.objectContaining({ path: '/user-roles', usable: true }),
    ]));
    await request(h.app.getHttpServer()).get('/api/v1/admin/roles').set('Authorization', `Bearer ${h.token}`).expect(200);
    await request(h.app.getHttpServer()).get('/api/v1/admin/user-roles').set('Authorization', `Bearer ${h.token}`).expect(200);
  });

  it('keeps company role viewers on Roles but denies User Roles before its assignment query', async () => {
    h.grant('role.view', ids.companyA);
    const response = await get().expect(200);

    expect(response.body.data.modules.find((module: { path: string }) => module.path === '/roles')?.usable).toBe(true);
    expect(response.body.data.modules.find((module: { path: string }) => module.path === '/user-roles')?.usable).toBe(false);
    await request(h.app.getHttpServer()).get('/api/v1/admin/roles').set('Authorization', `Bearer ${h.token}`).expect(200);
    h.prisma.userRole.findMany.mockClear();
    await request(h.app.getHttpServer()).get('/api/v1/admin/user-roles').set('Authorization', `Bearer ${h.token}`).expect(403);
    // The permission guard resolves the caller grant once; the controller list
    // query must not run after that denial.
    expect(h.prisma.userRole.findMany).toHaveBeenCalledTimes(1);
  });

  it('keeps project role viewers consistent with the global-only role endpoints', async () => {
    h.grant('role.view', ids.companyA, ids.projectA);
    const response = await get().expect(200);

    expect(response.body.data.modules.find((module: { path: string }) => module.path === '/roles')?.usable).toBe(false);
    expect(response.body.data.modules.find((module: { path: string }) => module.path === '/user-roles')?.usable).toBe(false);
    await request(h.app.getHttpServer()).get('/api/v1/admin/roles').set('Authorization', `Bearer ${h.token}`).expect(403);
    await request(h.app.getHttpServer()).get('/api/v1/admin/user-roles').set('Authorization', `Bearer ${h.token}`).expect(403);
  });

  it('does not treat a project-scoped company grant as company-list or dashboard access', async () => {
    h.grant('company.view', ids.companyA, ids.projectA);
    const response = await get().expect(200);

    expect(response.body.data.permissions).toEqual(['company.view']);
    expect(response.body.data.modules.find((module: { path: string }) => module.path === '/')?.usable).toBe(false);
    expect(response.body.data.modules.find((module: { path: string }) => module.path === '/companies')?.usable).toBe(false);
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
