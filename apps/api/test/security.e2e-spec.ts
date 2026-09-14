import request from 'supertest';
import { createHarness, Harness, ids } from './api-harness';

describe('backend security through Nest HTTP', () => {
  let h: Harness;
  beforeEach(async () => { h = await createHarness(); });
  afterEach(async () => { await h?.close(); });
  const property = { project_id: ids.projectA, property_code: 'A-102', asset_type: 'RESIDENTIAL', status: 'AVAILABLE' };

  it('rejects anonymous, mock, and forged bearer tokens without bypassing auth', async () => {
    for (const token of [undefined, 'mock-token', 'not.a.jwt']) {
      const call = request(h.app.getHttpServer()).get('/api/v1/admin/users');
      if (token) call.set('Authorization', `Bearer ${token}`);
      await call.expect(401);
    }
    expect(h.prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('redacts legacy audit payloads when reading them', async () => {
    h.grant('audit.view', ids.companyA);
    h.prisma.auditLog.findMany.mockResolvedValue([{ id: 'legacy', before_data: { credential_ref: 'legacy-hash', password: 'old-secret' }, after_data: { nested: { apiKey: 'live-key' } } }]);
    const result = await request(h.app.getHttpServer()).get('/api/v1/admin/audit-logs').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(result.body.data[0].before_data).toEqual({ credential_ref: '[REDACTED]', password: '[REDACTED]' });
    expect(result.body.data[0].after_data.nested.apiKey).toBe('[REDACTED]');
  });

  it('accepts a genuinely signed JWT but denies absent permissions', async () => {
    await request(h.app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${h.token}`).expect(200);
    await request(h.app.getHttpServer()).get('/api/v1/admin/users').set('Authorization', `Bearer ${h.token}`).expect(403);
  });

  it('constrains project-scoped property lists even without caller scope', async () => {
    h.grant('property.view', ids.companyA, ids.projectA);
    await request(h.app.getHttpServer()).get('/api/v1/admin/properties').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(h.prisma.property.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: [{ project: { OR: [{ company_id: ids.companyA, id: ids.projectA }] } }, expect.any(Object)] }, take: 100, skip: 0 }));
  });

  it.each([
    ['companies', 'company.view', 'company'],
    ['projects', 'project.view', 'project'],
    ['customers', 'customer.view', 'user'],
    ['customer-properties', 'customer_property.view', 'customerProperty'],
    ['integrations', 'integration.view', 'companyIntegration'],
    ['business-services', 'integration.view', 'businessService'],
    ['audit-logs', 'audit.view', 'auditLog'],
    ['roles', 'role.view', 'role'],
  ])('applies tenant filters to the %s list without query hints', async (route, permission, model) => {
    h.grant(permission, ids.companyA);
    await request(h.app.getHttpServer()).get(`/api/v1/admin/${route}`).set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(JSON.stringify(h.prisma[model].findMany.mock.calls[0][0].where)).toContain(ids.companyA);
    expect(h.prisma[model].findMany.mock.calls[0][0].take).toBeLessThanOrEqual(200);
  });

  it('ANDs foreign list filters with permission-derived filters rather than replacing them', async () => {
    h.grant('property.view', ids.companyA);
    await request(h.app.getHttpServer()).get(`/api/v1/admin/properties?company_id=${ids.companyB}`).set('Authorization', `Bearer ${h.token}`).expect(200);
    const where = h.prisma.property.findMany.mock.calls[0][0].where;
    expect(where.AND[0]).toEqual({ project: { OR: [{ company_id: ids.companyA }] } });
    expect(where.AND[1].project).toEqual({ company_id: ids.companyB });
  });

  it('uses the stored property scope, ignoring forged query scope on mutations', async () => {
    h.grant('property.edit', ids.companyA, ids.projectA);
    await request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.propertyB}?company_id=${ids.companyA}&project_id=${ids.projectA}`).set('Authorization', `Bearer ${h.token}`).send({ floor: '2' }).expect(403);
    expect(h.prisma.property.update).not.toHaveBeenCalled();
  });

  it('authorizes company updates from the URL resource, not query scope', async () => {
    h.grant('company.manage', ids.companyA);
    await request(h.app.getHttpServer()).patch(`/api/v1/admin/companies/${ids.companyB}?company_id=${ids.companyA}`).set('Authorization', `Bearer ${h.token}`).send({ display_name: 'Changed' }).expect(403);
    expect(h.prisma.company.update).not.toHaveBeenCalled();
  });

  it('derives creation scope from the body project and its stored company', async () => {
    h.grant('property.create', ids.companyA, ids.projectA);
    await request(h.app.getHttpServer()).post(`/api/v1/admin/properties?project_id=${ids.projectA}`).set('Authorization', `Bearer ${h.token}`).send({ ...property, project_id: ids.projectB }).expect(403);
    await request(h.app.getHttpServer()).post('/api/v1/admin/properties').set('Authorization', `Bearer ${h.token}`).send(property).expect(201);
    expect(h.prisma.property.create).toHaveBeenCalledTimes(1);
  });

  it('does not let a project grant create sibling projects or access global controls', async () => {
    h.grant('project.create', ids.companyA, ids.projectA);
    h.grant('feature_flag.manage', ids.companyA);
    await request(h.app.getHttpServer()).post('/api/v1/admin/projects').set('Authorization', `Bearer ${h.token}`).send({ company_id: ids.companyA, project_code: 'NEW', project_name: 'New' }).expect(403);
    await request(h.app.getHttpServer()).patch(`/api/v1/admin/feature-flags/${ids.flag}?company_id=${ids.companyA}`).set('Authorization', `Bearer ${h.token}`).send({ enabled: true }).expect(403);
  });

  it('rejects nested Prisma operations, unknown fields and tenant reassignment', async () => {
    h.grant('property.edit', ids.companyA);
    for (const body of [{ project_id: ids.projectB }, { project: { connect: { id: ids.projectB } } }, { list_price: { increment: 1 } }, { id: ids.propertyB }, {}]) {
      await request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.propertyA}`).set('Authorization', `Bearer ${h.token}`).send(body).expect(400);
    }
    expect(h.prisma.property.update).not.toHaveBeenCalled();
  });

  it('requires separate status-change permission', async () => {
    h.grant('property.edit', ids.companyA);
    await request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.propertyA}`).set('Authorization', `Bearer ${h.token}`).send({ status: 'SOLD' }).expect(403);
    h.grant('property.change_status', ids.companyA);
    await request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.propertyA}`).set('Authorization', `Bearer ${h.token}`).send({ status: 'SOLD' }).expect(200);
  });

  it('fails closed on missing and disabled features', async () => {
    h.grant('property.view', ids.companyA);
    h.flags.delete('ENABLE_PROPERTIES');
    await request(h.app.getHttpServer()).get('/api/v1/admin/properties').set('Authorization', `Bearer ${h.token}`).expect(403);
    h.flags.get('ENABLE_COMPANY_DIRECTORY')!.enabled = false;
    await request(h.app.getHttpServer()).get('/api/v1/companies').expect(403);
    expect(h.prisma.property.findMany).not.toHaveBeenCalled();
    expect(h.prisma.company.findMany).not.toHaveBeenCalled();
  });

  it('returns canonical 404 for missing resources and 400 for malformed UUIDs', async () => {
    h.grant('property.edit');
    await request(h.app.getHttpServer()).patch(`/api/v1/admin/properties/${ids.user}`).set('Authorization', `Bearer ${h.token}`).send({ floor: '1' }).expect(404);
    await request(h.app.getHttpServer()).patch('/api/v1/admin/properties/not-a-uuid').set('Authorization', `Bearer ${h.token}`).send({ floor: '1' }).expect(400);
  });

  it('rejects invalid list filters and pagination', async () => {
    h.grant('property.view');
    for (const query of ['status=NOT_A_STATUS', 'take=10000', 'skip=-1', 'company_id=not-uuid', 'include=customer', 'status=AVAILABLE&status=SOLD']) {
      await request(h.app.getHttpServer()).get(`/api/v1/admin/properties?${query}`).set('Authorization', `Bearer ${h.token}`).expect(400);
    }
    expect(h.prisma.property.findMany).not.toHaveBeenCalled();
  });

  it('does not treat expired, mismatched or tenant-owned roles as global grants', async () => {
    h.grant('feature_flag.view');
    const grant = h.grants.get('feature_flag.view')![0];
    grant.expires_at = new Date(0);
    await request(h.app.getHttpServer()).get('/api/v1/admin/feature-flags').set('Authorization', `Bearer ${h.token}`).expect(403);
    grant.expires_at = null; grant.role.company_id = ids.companyA;
    await request(h.app.getHttpServer()).get('/api/v1/admin/feature-flags').set('Authorization', `Bearer ${h.token}`).expect(403);
    grant.company_id = ids.companyB;
    await request(h.app.getHttpServer()).get('/api/v1/admin/feature-flags').set('Authorization', `Bearer ${h.token}`).expect(403);
  });

  it('persists server request/correlation IDs and resource scope with audits and events', async () => {
    h.grant('property.create', ids.companyA, ids.projectA);
    const result = await request(h.app.getHttpServer()).post('/api/v1/admin/properties').set('Authorization', `Bearer ${h.token}`).set('X-Request-ID', 'caller-forged-id').set('X-Correlation-ID', 'safe-correlation').send(property).expect(201);
    expect(result.headers['x-request-id']).not.toBe('caller-forged-id');
    expect(result.body.meta.request_id).toBe(result.headers['x-request-id']);
    expect(h.prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actor_user_id: ids.user, company_id: ids.companyA, project_id: ids.projectA, request_id: result.headers['x-request-id'], correlation_id: 'safe-correlation', ip_address: expect.any(String) }) });
    expect(h.prisma.activityEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ company_id: ids.companyA, project_id: ids.projectA, request_id: result.headers['x-request-id'] }) });
    expect(h.prisma.$transaction).toHaveBeenCalled();
  });

  it('never exposes internal errors or database connection details', async () => {
    h.grant('user.view');
    h.prisma.user.findMany.mockRejectedValueOnce(new Error('postgres://admin:password@private-db token=secret'));
    const result = await request(h.app.getHttpServer()).get('/api/v1/admin/users').set('Authorization', `Bearer ${h.token}`).expect(500);
    expect(result.body.error).toEqual({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
    expect(JSON.stringify(result.body)).not.toMatch(/postgres|password|private-db|secret/);
  });

  it('does not select credentials or unrestricted user relation records', async () => {
    h.grant('user.view', ids.companyA);
    await request(h.app.getHttpServer()).get('/api/v1/admin/users').set('Authorization', `Bearer ${h.token}`).expect(200);
    const args = h.prisma.user.findMany.mock.calls[0][0];
    expect(args.where.AND[0]).toHaveProperty('OR');
    expect(args.select).not.toHaveProperty('password_hash');
    expect(args.select).not.toHaveProperty('roles');
    h.grant('integration.view', ids.companyA);
    await request(h.app.getHttpServer()).get('/api/v1/admin/integrations').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(h.prisma.companyIntegration.findMany.mock.calls[0][0].select).not.toHaveProperty('config');
  });
});
