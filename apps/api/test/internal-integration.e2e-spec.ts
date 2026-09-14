import request from 'supertest';
import { createHarness, Harness, ids } from './api-harness';
import { hashCompanyKey } from '../src/modules/security/company-api-key.service';

const rhcId = 'RHC-2026-00000001';
const keyId = '60000000-0000-4000-8000-000000000001';
const otherKey = '60000000-0000-4000-8000-000000000002';
const apiKey = `rhc_${ids.subject}.${'x'.repeat(43)}`;

describe('internal integration HTTP API', () => {
  let h: Harness;
  let client: any;
  let profile: any;
  let consents: Record<string, any[]>;
  let logs: any[];
  let eventEnabled: boolean;
  beforeEach(async () => {
    h = await createHarness();
    client = { id: ids.propertyA, client_id: ids.subject, company_id: ids.companyA, scopes: ['identity.verify', 'events.write'], credential_ref: hashCompanyKey(apiKey), status: 'ACTIVE', company: { status: 'ACTIVE', api_enabled: true } };
    profile = { rhc_id_issued_at: new Date('2026-01-01'), user: { id: ids.user, account_status: 'ACTIVE', auth_email_confirmed_at: new Date('2026-01-01'), verification_status: 'PENDING' } };
    const granted = { granted: true, granted_at: new Date('2026-01-01'), withdrawn_at: null, created_at: new Date('2026-01-01') };
    consents = { DATA_SHARING: [{ ...granted }], COMPANY_SERVICE: [{ ...granted }] };
    logs = []; eventEnabled = true;
    h.prisma.companyApiClient.findUnique.mockImplementation(async () => client);
    h.prisma.userProfile.findUnique.mockImplementation(async ({ where }: any) => where.rhc_id === rhcId ? profile : null);
    h.prisma.consentRecord = { findMany: jest.fn(async ({ where }: any) => where.company_id === ids.companyA ? consents[where.consent_type] : []) };
    h.prisma.companyEvent = { findUnique: jest.fn(async () => ({ enabled: eventEnabled })) };
    h.prisma.integrationLog = { findMany: jest.fn(async ({ where }: any) => logs.filter((log) => log.company_id === where.company_id && log.request_ref === where.request_ref)), create: jest.fn(async ({ data }: any) => { const log = { id: `log-${logs.length}`, ...data }; logs.push(log); return log; }) };
    h.prisma.$executeRaw = jest.fn(async () => 1);
  });
  afterEach(async () => { await h?.close(); });

  function verify(body: object = { rhc_id: rhcId }, key = keyId) {
    return request(h.app.getHttpServer()).post('/api/v1/internal/identity/verify').set('X-API-Key', apiKey).set('Idempotency-Key', key).send(body);
  }
  const eventBody = { event_type: 'SERVICE.COMPLETED', source_reference: ids.propertyA, occurred_at: '2026-01-01T00:00:00Z' };
  function event(body: object = eventBody, key = keyId) {
    return request(h.app.getHttpServer()).post('/api/v1/internal/events').set('X-API-Key', apiKey).set('Idempotency-Key', key).send(body);
  }

  it('requires machine authentication and dedicated scopes, not user JWTs', async () => {
    await request(h.app.getHttpServer()).post('/api/v1/internal/identity/verify').set('Authorization', `Bearer ${h.token}`).set('Idempotency-Key', keyId).send({ rhc_id: rhcId }).expect(401);
    client.scopes = ['company.read'];
    await verify().expect(403); await event().expect(403);
    expect(h.prisma.integrationLog.create).not.toHaveBeenCalled();
  });

  it('returns only current ID validity, independently of business verification status', async () => {
    const result = await verify().expect(200);
    expect(result.body.data).toEqual({ verified: true });
    expect(result.headers['cache-control']).toBe('no-store');
    expect(h.prisma.userProfile.findUnique.mock.calls[0][0].select.user.select).toEqual({ id: true, account_status: true, auth_email_confirmed_at: true });
    expect(h.prisma.user.update).not.toHaveBeenCalled();
    expect(h.prisma.userProfile.update).not.toHaveBeenCalled();
    expect(h.issuance.issueForUser).not.toHaveBeenCalled();
    expect(JSON.stringify(logs)).not.toMatch(/RHC-2026|customer@example|test-only-secret/);
    expect(JSON.stringify(h.prisma.auditLog.create.mock.calls)).not.toContain(rhcId);
    expect(logs[0].metadata.request_id).toBe(result.body.meta.request_id);
  });

  it('uses company-specific latest consent, not any historical grant', async () => {
    consents.DATA_SHARING.unshift({ granted: false, granted_at: null, withdrawn_at: new Date('2026-02-01'), created_at: new Date('2026-02-01') });
    const result = await verify().expect(200);
    expect(result.body.data).toEqual({ verified: false });
    expect(h.prisma.consentRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { user_id: ids.user, company_id: ids.companyA, consent_type: 'DATA_SHARING' }, take: 2 }));
    expect(h.prisma.consentRecord.findMany.mock.calls[0][0].where).not.toHaveProperty('granted');
  });

  it('does not disclose identities without consent or leak cross-company results', async () => {
    client.company_id = ids.companyB;
    expect((await verify().expect(200)).body.data).toEqual({ verified: false });
    expect((await verify({ rhc_id: 'RHC-2026-99999999' }, otherKey).expect(200)).body.data).toEqual({ verified: false });
  });

  it('does not replay a positive result after consent withdrawal or account disablement', async () => {
    expect((await verify().expect(200)).body.data.verified).toBe(true);
    consents.DATA_SHARING[0].withdrawn_at = new Date();
    expect((await verify().expect(200)).body.data.verified).toBe(false);
    consents.DATA_SHARING[0].withdrawn_at = null;
    profile.user.account_status = 'DISABLED';
    expect((await verify().expect(200)).body.data.verified).toBe(false);
    expect(h.prisma.integrationLog.create).toHaveBeenCalledTimes(1);
  });

  it('does not substitute business verification for auth confirmation', async () => {
    profile.user.verification_status = 'VERIFIED'; profile.user.auth_email_confirmed_at = null;
    expect((await verify().expect(200)).body.data.verified).toBe(false);
  });

  it('requires UUID idempotency headers and strict minimal request bodies', async () => {
    await request(h.app.getHttpServer()).post('/api/v1/internal/identity/verify').set('X-API-Key', apiKey).send({ rhc_id: rhcId }).expect(400);
    await verify({}, 'bad-key').expect(400);
    await verify({ rhc_id: rhcId, company_id: ids.companyB }).expect(400);
    await verify({ email: 'private@example.test' }).expect(400);
    await event({ ...eventBody, payload: { token: 'secret' } }).expect(400);
    await event({ ...eventBody, event_type: 'PROPERTY.SOLD' }).expect(400);
    expect(h.prisma.integrationLog.create).not.toHaveBeenCalled();
    expect(h.prisma.activityEvent.create).not.toHaveBeenCalled();
  });

  it('deduplicates exact requests, rejects key reuse with a different payload, and takes an advisory transaction lock', async () => {
    await verify().expect(200); await verify().expect(200);
    await verify({ rhc_id: 'RHC-2026-99999999' }).expect(409);
    expect(h.prisma.integrationLog.create).toHaveBeenCalledTimes(1);
    expect(h.prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(h.prisma.$executeRaw).toHaveBeenCalledTimes(3);
    expect(h.prisma.$executeRaw.mock.calls[0][0][0]).toContain('pg_advisory_xact_lock');
    expect(h.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: 'ReadCommitted' }));
  });

  it('records only namespaced allowed events and returns the original receipt on replay', async () => {
    const first = await event().expect(202);
    expect(first.body.data).toEqual({ accepted: true, event_id: 'event' });
    expect((await event().expect(202)).body.data).toEqual(first.body.data);
    expect(h.prisma.activityEvent.create).toHaveBeenCalledTimes(1);
    expect(h.prisma.activityEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ event_type: 'INTEGRATION.SERVICE.COMPLETED', company_id: ids.companyA, entity_type: 'company', entity_id: ids.companyA, payload: { source_reference: ids.propertyA, occurred_at: eventBody.occurred_at, client_id: ids.subject } }) });
    expect(h.prisma.integrationLog.create).toHaveBeenCalledTimes(1);
    expect(h.prisma.consentRecord.findMany).not.toHaveBeenCalled();
    await event({ ...eventBody, source_reference: ids.propertyB }).expect(409);
  });

  it('requires both data-sharing and company-service consent for user-related events', async () => {
    consents.COMPANY_SERVICE = [];
    await event({ ...eventBody, rhc_id: rhcId }).expect(403);
    expect(h.prisma.activityEvent.create).not.toHaveBeenCalled();
    consents.COMPANY_SERVICE = [...consents.DATA_SHARING];
    await event({ ...eventBody, rhc_id: rhcId }).expect(202);
    expect(h.prisma.activityEvent.create.mock.calls[0][0].data).toMatchObject({ entity_type: 'user', entity_id: ids.user });
    expect(JSON.stringify(h.prisma.activityEvent.create.mock.calls)).not.toContain(rhcId);
  });

  it('fails closed on company event allowlists and disabled features, including replay', async () => {
    eventEnabled = false;
    await event().expect(403);
    eventEnabled = true;
    h.flags.get('ENABLE_INTEGRATION_FRAMEWORK')!.enabled = false;
    await event().expect(403); await verify().expect(403);
    h.flags.get('ENABLE_INTEGRATION_FRAMEWORK')!.enabled = true;
    h.flags.get('ENABLE_RHC_ID')!.enabled = false;
    await verify().expect(403);
    expect(h.prisma.activityEvent.create).not.toHaveBeenCalled();
  });

  it('partitions idempotency receipts by authenticated client/company and operation', async () => {
    await verify().expect(200); await event().expect(202);
    client.company_id = ids.companyB;
    await verify().expect(200);
    expect(new Set(logs.map((log) => log.request_ref)).size).toBe(3);
    expect(logs.map((log) => log.company_id)).toEqual([ids.companyA, ids.companyA, ids.companyB]);
  });
});
