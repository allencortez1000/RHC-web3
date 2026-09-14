import request from 'supertest';
import { createHarness, Harness, ids } from './api-harness';

describe('HTTP authentication and ID integration with real services', () => {
  let h: Harness;
  beforeEach(async () => { h = await createHarness(); });
  afterEach(async () => { await h?.close(); });

  it.each(['RS256', 'ES256'] as const)('verifies %s JWTs and synchronizes only server-confirmed identity fields', async (algorithm) => {
    h.user.verification_status = 'REJECTED';
    h.profiles.get(ids.user).verification_status = 'REJECTED';
    h.identity.email = 'authoritative@example.test';
    const token = await h.signToken({}, algorithm);
    const response = await request(h.app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${token}`).expect(200);
    expect(response.body.data.user).toMatchObject({ email: h.identity.email, verification_status: 'REJECTED', auth_email_confirmed_at: '2026-01-01T00:00:00.000Z' });
    expect(h.prisma.user.update.mock.calls[0][0].data).toEqual({ email: h.identity.email, auth_email_confirmed_at: new Date('2026-01-01'), profile: { upsert: { create: { email: h.identity.email, account_status: 'ACTIVE', verification_status: 'REJECTED' }, update: { email: h.identity.email } } } });
    expect(h.prisma.$executeRaw.mock.calls[0][0][0]).toContain('pg_advisory_xact_lock');
    expect(h.prisma.$queryRaw.mock.calls[0][0].join('')).toContain('FOR UPDATE');
    expect(h.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });

  it.each([{ exp: undefined }, { iat: undefined }, { sub: undefined }, { exp: 1 }])('rejects missing/expired required claims %j before the admin lookup', async (claims) => {
    const token = await h.signToken(claims);
    await request(h.app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${token}`).expect(401);
    expect(h.identityRequests).toHaveLength(0);
    expect(h.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a mismatched admin response subject and does not provision', async () => {
    h.identity.id = ids.propertyB;
    await request(h.app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${h.token}`).expect(401);
    expect(h.prisma.user.update).not.toHaveBeenCalled();
    expect(h.prisma.user.create).not.toHaveBeenCalled();
  });

  it('does not substitute user metadata for email confirmation or business approval', async () => {
    h.identity.email_confirmed_at = null;
    h.identity.user_metadata = { email_confirmed_at: '2026-01-01T00:00:00Z', verification_status: 'VERIFIED' };
    const response = await request(h.app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(response.body.data.user).toMatchObject({ auth_email_confirmed_at: null, verification_status: 'PENDING' });
    await request(h.app.getHttpServer()).post('/api/v1/me/rhc-id').set('Authorization', `Bearer ${h.token}`).send({}).expect(403);
    expect(h.prisma.rhcIdSequence.upsert).not.toHaveBeenCalled();
  });

  it('gates new provisioning by registration without blocking existing-user synchronization', async () => {
    h.flags.get('ENABLE_REGISTRATION')!.enabled = false;
    await request(h.app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${h.token}`).expect(200);
    h.users.delete(ids.user); h.profiles.delete(ids.user);
    await request(h.app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${h.token}`).expect(403);
    expect(h.prisma.user.create).not.toHaveBeenCalled();
    h.flags.get('ENABLE_REGISTRATION')!.enabled = true;
    const response = await request(h.app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(response.body.data.user).toMatchObject({ account_status: 'ACTIVE', verification_status: 'PENDING' });
    expect(h.prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'user.provision', request_id: response.body.meta.request_id }) });
    expect(h.prisma.activityEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ event_type: 'USER.CREATED', request_id: response.body.meta.request_id }) });
  });

  it('repairs a missing profile without changing the existing business/account state', async () => {
    h.user.account_status = 'PENDING'; h.user.verification_status = 'REJECTED';
    h.profiles.delete(ids.user);
    await request(h.app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${h.token}`).expect(200);
    expect(h.profiles.get(ids.user)).toMatchObject({ account_status: 'PENDING', verification_status: 'REJECTED' });
    expect(h.user).toMatchObject({ account_status: 'PENDING', verification_status: 'REJECTED' });
  });

  it.each(['LOCKED', 'DISABLED'])('preserves and denies an existing %s account', async (status) => {
    h.user.account_status = status;
    await request(h.app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${h.token}`).expect(401);
    expect(h.prisma.user.update).not.toHaveBeenCalled();
  });

  it('requires actual business approval before real ID issuance and emits one issue event on retries', async () => {
    await request(h.app.getHttpServer()).post('/api/v1/me/rhc-id').set('Authorization', `Bearer ${h.token}`).send({}).expect(403);
    expect(h.prisma.rhcIdSequence.upsert).not.toHaveBeenCalled();
    h.user.verification_status = 'VERIFIED'; h.profiles.get(ids.user).verification_status = 'VERIFIED';
    const first = await request(h.app.getHttpServer()).post('/api/v1/me/rhc-id').set('Authorization', `Bearer ${h.token}`).send({}).expect(201);
    const repeat = await request(h.app.getHttpServer()).post('/api/v1/me/rhc-id').set('Authorization', `Bearer ${h.token}`).send({}).expect(201);
    expect(repeat.body.data).toEqual(first.body.data);
    expect(first.body.data.rhc_id).toMatch(/^RHC-\d{4}-00000001$/);
    expect(h.prisma.rhcIdSequence.upsert).toHaveBeenCalledTimes(1);
    expect(h.prisma.activityEvent.create.mock.calls.filter(([arg]: any) => arg.data.event_type === 'RHC_ID.CREATED')).toHaveLength(1);
    expect(h.prisma.auditLog.create.mock.calls.filter(([arg]: any) => arg.data.action === 'rhc_id.issue')).toHaveLength(1);
  });
});
