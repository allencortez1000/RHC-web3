import request from 'supertest';
import { createHarness, Harness, ids } from './api-harness';
import { hashCompanyKey } from '../src/modules/security/company-api-key.service';

describe('Month 1 API HTTP contract', () => {
  let h: Harness;
  beforeEach(async () => { h = await createHarness(); });
  afterEach(async () => { await h?.close(); });

  it('GET reads the current ID without issuing; POST issues with strict body and feature checks', async () => {
    h.user.verification_status = 'VERIFIED';
    const result = await request(h.app.getHttpServer()).get('/api/v1/me/rhc-id').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(result.body.data).toEqual({ rhc_id: null, rhc_id_issued_at: null });
    expect(h.issuance.issueForUser).not.toHaveBeenCalled();
    await request(h.app.getHttpServer()).post('/api/v1/me/rhc-id').set('Authorization', `Bearer ${h.token}`).send({ user_id: ids.propertyB }).expect(400);
    await request(h.app.getHttpServer()).post('/api/v1/me/rhc-id').set('Authorization', `Bearer ${h.token}`).send({}).expect(201);
    expect(h.issuance.issueForUser).toHaveBeenCalledWith(ids.user);
    h.flags.get('ENABLE_RHC_ID')!.enabled = false;
    await request(h.app.getHttpServer()).post('/api/v1/me/rhc-id').set('Authorization', `Bearer ${h.token}`).send({}).expect(403);
    await request(h.app.getHttpServer()).get('/api/v1/me/rhc-id').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(h.issuance.issueForUser).toHaveBeenCalledTimes(1);
  });

  it('rejects profile security fields and invalid calendar dates', async () => {
    for (const body of [{ verification_status: 'VERIFIED' }, { auth_email_confirmed_at: '2026-01-01' }, { rhc_id: 'forged' }, { email: 'other@example.test' }, { birth_date: '2026-02-30' }]) {
      await request(h.app.getHttpServer()).patch('/api/v1/me').set('Authorization', `Bearer ${h.token}`).send(body).expect(400);
    }
    await request(h.app.getHttpServer()).patch('/api/v1/me').set('Authorization', `Bearer ${h.token}`).send({ first_name: 'Test', birth_date: '2000-02-29' }).expect(200);
    expect(h.prisma.userProfile.update).toHaveBeenCalledWith({ where: { user_id: ids.user }, data: { first_name: 'Test', birth_date: new Date('2000-02-29') } });
  });

  it('globally throttles issuance and does not let forwarded IP headers evade the bucket', async () => {
    h.user.verification_status = 'VERIFIED';
    for (let i = 0; i < 5; i += 1) await request(h.app.getHttpServer()).post('/api/v1/me/rhc-id').set('Authorization', `Bearer ${h.token}`).set('X-Forwarded-For', `192.0.2.${i}`).send({}).expect(201);
    const response = await request(h.app.getHttpServer()).post('/api/v1/me/rhc-id').set('Authorization', `Bearer ${h.token}`).set('X-Forwarded-For', '192.0.2.99').send({}).expect(429);
    expect(response.headers['retry-after']).toBe('60');
    expect(h.issuance.issueForUser).toHaveBeenCalledTimes(5);
    expect(h.rates.consume).toHaveBeenCalled();
  });

  it('fails closed during rate-store outages, while liveness remains independent', async () => {
    h.rates.unavailable = true;
    await request(h.app.getHttpServer()).get('/api/v1/companies').expect(503);
    expect(h.prisma.company.findMany).not.toHaveBeenCalled();
    await request(h.app.getHttpServer()).get('/api/v1/health').expect(200);
    await request(h.app.getHttpServer()).get('/api/v1/health/ready').expect(503);
  });

  it('readiness checks dependencies without exposing their details', async () => {
    await request(h.app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    expect(h.prisma.$queryRaw).toHaveBeenCalled();
    expect(h.rates.healthy).toHaveBeenCalled();
    h.prisma.$queryRaw.mockRejectedValueOnce(new Error('database password=secret'));
    const response = await request(h.app.getHttpServer()).get('/api/v1/health/ready').expect(503);
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });

  it('keeps password endpoints absent', async () => {
    await request(h.app.getHttpServer()).post('/api/v1/auth/login').send({}).expect(404);
    await request(h.app.getHttpServer()).post('/api/v1/auth/register').send({}).expect(404);
  });

  it('issues one-time API keys with only versioned hashes persisted and no hash in audit data', async () => {
    h.grant('integration.manage', ids.companyA);
    const response = await request(h.app.getHttpServer()).post('/api/v1/admin/api-clients').set('Authorization', `Bearer ${h.token}`).send({ company_id: ids.companyA, client_name: 'Partner', scopes: ['company.read'] }).expect(201);
    const key = response.body.data.api_key;
    expect(key).toMatch(/^rhc_[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(h.prisma.companyApiClient.create.mock.calls[0][0].data.credential_ref).toBe(hashCompanyKey(key));
    expect(response.body.data.client).not.toHaveProperty('credential_ref');
    expect(JSON.stringify(h.prisma.auditLog.create.mock.calls)).not.toContain(key);
    expect(JSON.stringify(h.prisma.auditLog.create.mock.calls)).not.toContain(hashCompanyKey(key));
  });

  it('denies key issuance outside the company scope and unknown API permissions', async () => {
    h.grant('integration.manage', ids.companyA);
    await request(h.app.getHttpServer()).post('/api/v1/admin/api-clients').set('Authorization', `Bearer ${h.token}`).send({ company_id: ids.companyB, client_name: 'Partner', scopes: ['company.read'] }).expect(403);
    await request(h.app.getHttpServer()).post('/api/v1/admin/api-clients').set('Authorization', `Bearer ${h.token}`).send({ company_id: ids.companyA, client_name: 'Partner', scopes: ['admin.write'] }).expect(400);
    expect(h.prisma.companyApiClient.create).not.toHaveBeenCalled();
  });

  it('isolates machine credentials from JWT routes and enforces scopes/company status', async () => {
    const key = `rhc_${ids.subject}.${'x'.repeat(43)}`;
    const client = { id: ids.propertyA, client_id: ids.subject, company_id: ids.companyA, scopes: ['company.read'], credential_ref: hashCompanyKey(key), status: 'ACTIVE', company: { status: 'ACTIVE', api_enabled: true } };
    h.prisma.companyApiClient.findUnique.mockResolvedValue(client);
    await request(h.app.getHttpServer()).get('/api/v1/company-api/company').set('X-API-Key', key).expect(200);
    expect(h.prisma.company.findUniqueOrThrow).toHaveBeenCalledWith(expect.objectContaining({ where: { id: ids.companyA } }));
    await request(h.app.getHttpServer()).get('/api/v1/company-api/projects').set('X-API-Key', key).expect(403);
    await request(h.app.getHttpServer()).get('/api/v1/company-api/company').set('X-API-Key', `${key.slice(0, -1)}y`).expect(401);
    await request(h.app.getHttpServer()).get('/api/v1/admin/users').set('X-API-Key', key).expect(401);
    await request(h.app.getHttpServer()).get('/api/v1/admin/users').set('Authorization', `Bearer ${key}`).expect(401);
    await request(h.app.getHttpServer()).get(`/api/v1/company-api/company?company_id=${ids.companyB}`).set('X-API-Key', key).expect(400);
    client.company.api_enabled = false;
    await request(h.app.getHttpServer()).get('/api/v1/company-api/company').set('X-API-Key', key).expect(401);
  });

  it('rotation invalidates the old secret and revocation works with the feature switched off', async () => {
    h.grant('integration.manage', ids.companyA);
    const oldKey = `rhc_${ids.subject}.${'x'.repeat(43)}`;
    const client: any = { id: ids.propertyA, client_id: ids.subject, company_id: ids.companyA, client_name: 'Partner', scopes: ['company.read'], credential_ref: hashCompanyKey(oldKey), status: 'ACTIVE', company: { status: 'ACTIVE', api_enabled: true } };
    h.prisma.companyApiClient.findUnique.mockImplementation(async () => client);
    h.prisma.companyApiClient.findUniqueOrThrow.mockImplementation(async () => client);
    h.prisma.companyApiClient.update.mockImplementation(async ({ data, select }: any) => {
      Object.assign(client, data);
      return Object.fromEntries(Object.entries(client).filter(([key]) => select?.[key] === true));
    });
    const rotation = await request(h.app.getHttpServer()).post(`/api/v1/admin/api-clients/${client.id}/rotate`).set('Authorization', `Bearer ${h.token}`).send({}).expect(201);
    const newKey = rotation.body.data.api_key;
    expect(newKey).not.toBe(oldKey);
    expect(rotation.body.data.client).not.toHaveProperty('credential_ref');
    expect(client.credential_ref).toBe(hashCompanyKey(newKey));
    await request(h.app.getHttpServer()).get('/api/v1/company-api/company').set('X-API-Key', oldKey).expect(401);
    await request(h.app.getHttpServer()).get('/api/v1/company-api/company').set('X-API-Key', newKey).expect(200);
    h.flags.get('ENABLE_INTEGRATION_FRAMEWORK')!.enabled = false;
    await request(h.app.getHttpServer()).post(`/api/v1/admin/api-clients/${client.id}/revoke`).set('Authorization', `Bearer ${h.token}`).send({}).expect(201);
    expect(client.status).toBe('INACTIVE');
    expect(client.credential_ref).toBeNull();
    h.flags.get('ENABLE_INTEGRATION_FRAMEWORK')!.enabled = true;
    await request(h.app.getHttpServer()).get('/api/v1/company-api/company').set('X-API-Key', newKey).expect(401);
    expect(JSON.stringify(h.prisma.auditLog.create.mock.calls)).not.toContain(newKey);
  });

  it('does not expose API key hashes in administrative lists or allow cross-company revocation', async () => {
    h.grant('integration.view', ids.companyA);
    h.grant('integration.manage', ids.companyA);
    await request(h.app.getHttpServer()).get('/api/v1/admin/api-clients').set('Authorization', `Bearer ${h.token}`).expect(200);
    const args = h.prisma.companyApiClient.findMany.mock.calls[0][0];
    expect(args.where.company).toEqual({ OR: [{ id: ids.companyA }] });
    expect(args.select).not.toHaveProperty('credential_ref');
    h.prisma.companyApiClient.findUnique.mockResolvedValue({ company_id: ids.companyB });
    await request(h.app.getHttpServer()).post(`/api/v1/admin/api-clients/${ids.propertyB}/revoke`).set('Authorization', `Bearer ${h.token}`).send({}).expect(403);
    expect(h.prisma.companyApiClient.update).not.toHaveBeenCalled();
  });

  it('bounds public projections and hides non-public properties', async () => {
    await request(h.app.getHttpServer()).get('/api/v1/companies').expect(200);
    expect(h.prisma.company.findMany.mock.calls[0][0]).toMatchObject({ where: { status: { in: ['ACTIVE', 'PREPARED'] } }, take: 100 });
    expect(h.prisma.company.findMany.mock.calls[0][0].select).not.toHaveProperty('api_clients');
    await request(h.app.getHttpServer()).get(`/api/v1/properties/${ids.propertyB}`).expect(404);
    expect(h.prisma.property.findFirst.mock.calls[0][0].where).toEqual({ id: ids.propertyB, status: 'AVAILABLE', project: { status: 'ACTIVE', company: { status: 'ACTIVE' } } });
  });
});
