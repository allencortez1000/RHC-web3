import request from 'supertest';
import { createHarness, Harness, ids } from './api-harness';

const grant = { consent_type: 'DATA_SHARING', purpose: 'COMPANY_DATA_SHARING', company_id: ids.companyA, consent_version: '2026-09.v1', granted: true };

describe('self-service consent and public registration config', () => {
  let h: Harness;
  let records: any[];
  beforeEach(async () => {
    h = await createHarness();
    records = [];
    const project = (record: any) => ({ ...record, company: record.company_id ? { id: record.company_id, display_name: 'Fixture company', status: 'ACTIVE' } : null });
    h.prisma.consentRecord = {
      findMany: jest.fn(async ({ where, take, skip }: any) => records.filter((record) => Object.entries(where).every(([key, value]) => value === undefined || record[key] === value)).sort((a, b) => b.created_at.getTime() - a.created_at.getTime() || b.id.localeCompare(a.id)).slice(skip, skip + take).map(project)),
      create: jest.fn(async ({ data }: any) => { const record = { id: `60000000-0000-4000-8000-${String(records.length + 1).padStart(12, '0')}`, ...data }; records.push(record); return project(record); }),
    };
    // Model rollback at the database boundary; production Prisma executes the same
    // controller/audit/event callback in a real database transaction.
    h.prisma.$transaction.mockImplementation(async (callback: any) => {
      const previous = [...records];
      try { return await callback(h.prisma); }
      catch (error) { records.splice(0, records.length, ...previous); throw error; }
    });
  });
  afterEach(async () => { await h.close(); });
  const post = (body: unknown = grant) => request(h.app.getHttpServer()).post('/api/v1/me/consents').set('Authorization', `Bearer ${h.token}`).send(body as object);
  const get = (query = '') => request(h.app.getHttpServer()).get(`/api/v1/me/consents${query}`).set('Authorization', `Bearer ${h.token}`);

  it('returns only registration availability anonymously, uncached and fail-closed for a missing flag', async () => {
    const config = () => request(h.app.getHttpServer()).get('/api/v1/auth/config');
    const enabled = await config().expect(200);
    expect(enabled.body.data).toEqual({ registration_enabled: true });
    expect(enabled.headers['cache-control']).toBe('no-store');
    expect(enabled.headers['x-ratelimit-limit']).toBe('120');
    h.flags.get('ENABLE_REGISTRATION')!.enabled = false;
    expect((await config().expect(200)).body.data).toEqual({ registration_enabled: false });
    h.flags.delete('ENABLE_REGISTRATION');
    expect((await config().expect(200)).body.data).toEqual({ registration_enabled: false });
    expect(h.prisma.user.findUnique).not.toHaveBeenCalled();
    expect(h.identityRequests).toHaveLength(0);
  });

  it('keeps global rate limiting on public config, including store failure', async () => {
    h.rates.unavailable = true;
    await request(h.app.getHttpServer()).get('/api/v1/auth/config').expect(503);
    expect(h.prisma.featureFlag.findUnique).not.toHaveBeenCalled();
    h.rates.unavailable = false;
    h.rates.consume.mockResolvedValue({ count: 121, retryAfter: 60 });
    await request(h.app.getHttpServer()).get('/api/v1/auth/config').expect(429);
  });

  it('requires verified authentication and rejects unavailable accounts', async () => {
    await request(h.app.getHttpServer()).get('/api/v1/me/consents').expect(401);
    await request(h.app.getHttpServer()).post('/api/v1/me/consents').send(grant).expect(401);
    h.user.account_status = 'DISABLED';
    await get().expect(401);
    await post().expect(401);
    expect(h.prisma.consentRecord.create).not.toHaveBeenCalled();
    expect(h.prisma.consentRecord.findMany).not.toHaveBeenCalled();
  });

  it('appends versioned grants and withdrawals for the authenticated application user', async () => {
    const before = Date.now();
    const first = await post().set('X-Request-Id', 'consent-request').set('X-Correlation-Id', 'consent-correlation').expect(201);
    expect(first.body.data).toMatchObject({ ...grant, withdrawn_at: null });
    expect(Date.parse(first.body.data.granted_at)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(first.body.data.granted_at)).toBeLessThanOrEqual(Date.now());
    expect(records[0]).toMatchObject({ user_id: ids.user, metadata: { purpose: grant.purpose } });
    expect(records[0].user_id).not.toBe(ids.subject);
    expect(first.body.data).not.toHaveProperty('metadata');
    expect(h.prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actor_user_id: ids.user, action: 'consent.grant', entity_type: 'consent_record', entity_id: first.body.data.id, company_id: ids.companyA, request_id: first.headers['x-request-id'], correlation_id: 'consent-correlation', after_data: expect.objectContaining({ purpose: grant.purpose, consent_version: grant.consent_version, granted: true }) }) });
    expect(h.prisma.activityEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actor_user_id: ids.user, event_type: 'CONSENT.GRANTED', entity_id: first.body.data.id, request_id: first.headers['x-request-id'], correlation_id: 'consent-correlation', payload: expect.objectContaining({ purpose: grant.purpose, consent_version: grant.consent_version }) }) });
    await post({ ...grant, consent_version: '2026-09.v2', granted: false }).expect(201);
    expect(records).toHaveLength(2);
    expect(records[0].granted).toBe(true);
    expect(records[0].withdrawn_at).toBeNull();
    expect(records[1]).toMatchObject({ granted: false, granted_at: null, withdrawn_at: expect.any(Date), consent_version: '2026-09.v2' });
    expect(h.prisma.activityEvent.create.mock.calls[1][0].data.event_type).toBe('CONSENT.WITHDRAWN');
    const history = (await get().expect(200)).body.data;
    expect(history.records.map((row: any) => row.granted)).toEqual([false, true]);
    expect(history.policies.filter((policy: any) => policy.required).map((policy: any) => policy.consent_type)).toEqual(['PRIVACY_POLICY', 'TERMS']);
  });

  it('keeps account policies and optional marketing independent of company permissions', async () => {
    for (const [consent_type, purpose] of [['PRIVACY_POLICY', 'ACCOUNT_PRIVACY'], ['TERMS', 'ACCOUNT_TERMS'], ['MARKETING', 'MARKETING_COMMUNICATIONS']]) {
      await post({ consent_type, purpose, consent_version: 'v1', granted: true }).expect(201);
    }
    expect(records).toHaveLength(3);
    expect(records.every((row) => row.company_id === null)).toBe(true);
    await post({ consent_type: 'PRIVACY_POLICY', purpose: 'ACCOUNT_PRIVACY', consent_version: 'v1', granted: false }).expect(201);
    expect(h.user.account_status).toBe('ACTIVE');
    expect(h.issuance.issueForUser).not.toHaveBeenCalled();
  });

  it('strictly validates scope, purpose, version, decisions, timestamps and caller identity', async () => {
    for (const invalid of [
      { ...grant, user_id: ids.subject }, { ...grant, metadata: { purpose: 'forged' } },
      { ...grant, created_at: '2020-01-01' }, { ...grant, granted_at: '2020-01-01' }, { ...grant, withdrawn_at: null },
      { ...grant, granted: 'true' }, { ...grant, consent_version: '' }, { ...grant, consent_version: 'a'.repeat(81) },
      { ...grant, purpose: 'MARKETING_COMMUNICATIONS' }, { ...grant, consent_type: 'UNKNOWN' },
      { ...grant, company_id: 'not-a-uuid' }, { ...grant, company_id: null },
      { ...grant, consent_type: 'MARKETING', purpose: 'MARKETING_COMMUNICATIONS' },
    ]) await post(invalid).expect(400);
    await get(`?user_id=${ids.subject}`).expect(400);
    await get('?company_id=invalid').expect(400);
    await get('?take=101').expect(400);
    expect(records).toHaveLength(0);
  });

  it('validates company existence and active status for grants but permits withdrawal when inactive', async () => {
    await post({ ...grant, company_id: ids.subject }).expect(404);
    for (const status of ['PREPARED', 'INACTIVE', 'SUSPENDED']) {
      h.prisma.company.findUnique.mockResolvedValue({ status });
      await post().expect(403);
      await post({ ...grant, granted: false }).expect(201);
    }
    expect(records).toHaveLength(3);
    expect(records.every((record) => !record.granted)).toBe(true);
  });

  it('reads only self history with bounded pagination and exact company/type filters', async () => {
    await post().expect(201);
    await post({ ...grant, company_id: ids.companyB }).expect(201);
    records.push({ ...records[0], id: ids.subject, user_id: ids.subject, metadata: { purpose: grant.purpose, secret: 'hidden' } });
    const all = (await get().expect(200)).body.data.records;
    expect(all).toHaveLength(2);
    expect(all.some((record: any) => record.id === ids.subject)).toBe(false);
    const filtered = (await get(`?company_id=${ids.companyA}&consent_type=DATA_SHARING&take=1&skip=0`).expect(200)).body.data.records;
    expect(filtered).toHaveLength(1);
    expect(filtered[0].company_id).toBe(ids.companyA);
    expect((await get('?take=1&skip=1').expect(200)).body.data.records).toHaveLength(1);
    expect(JSON.stringify(all)).not.toContain('hidden');
    expect(h.prisma.consentRecord.findMany.mock.calls[0][0].where).toEqual({ user_id: ids.user });
  });

  it.each(['auditLog', 'activityEvent'])('fails the append transaction if %s evidence fails', async (boundary) => {
    h.prisma[boundary].create.mockRejectedValueOnce(new Error('fixture evidence failure'));
    await post().expect(500);
    expect(records).toHaveLength(0);
    expect(h.prisma.$transaction).toHaveBeenCalled();
  });
});
