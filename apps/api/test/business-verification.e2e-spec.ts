import request from 'supertest';
import { createHarness, Harness, ids } from './api-harness';

describe('explicit administrative business approval', () => {
  let h: Harness;
  let target: any;
  const body = { expected_status: 'PENDING', review_reference: 'CASE-2026-001' };
  beforeEach(async () => {
    h = await createHarness();
    target = { id: ids.propertyA, email: 'reviewed@example.test', supabase_user_id: ids.propertyB, account_status: 'ACTIVE', verification_status: 'PENDING', auth_email_confirmed_at: new Date('2026-01-01') };
    h.users.set(target.id, target);
    h.profiles.set(target.id, { id: target.id, user_id: target.id, email: target.email, account_status: 'PENDING', verification_status: 'PENDING', rhc_id: null, rhc_id_issued_at: null });
  });
  afterEach(async () => { await h?.close(); });
  function approve(data: object = body, id = ids.propertyA, query = '') {
    return request(h.app.getHttpServer()).post(`/api/v1/admin/users/${id}/verification/approve${query}`).set('Authorization', `Bearer ${h.token}`).send(data);
  }
  function approvalWrites() { return h.prisma.user.update.mock.calls.filter(([arg]: any) => arg.where.id === target.id && arg.data.verification_status); }

  it('requires global user.manage, not view, customer.edit, or tenant-scoped management', async () => {
    await approve().expect(403);
    h.grant('user.view'); h.grant('customer.edit');
    await approve().expect(403);
    h.grant('user.manage', ids.companyA);
    await approve(body, target.id, `?company_id=${ids.companyA}`).expect(403);
    h.grant('user.manage', ids.companyA, ids.projectA);
    await approve().expect(403);
    expect(approvalWrites()).toHaveLength(0);
    expect(target.verification_status).toBe('PENDING');
  });

  it('approves only business verification, with row locking, reviewer reference, audit and event', async () => {
    h.grant('user.manage');
    const response = await approve().set('X-Correlation-ID', 'review-flow').expect(200);
    expect(response.body.data).toEqual({ id: target.id, verification_status: 'VERIFIED' });
    expect(approvalWrites()[0][0]).toEqual({ where: { id: target.id }, data: { verification_status: 'VERIFIED', profile: { update: { verification_status: 'VERIFIED' } } }, select: { id: true, verification_status: true } });
    expect(target.account_status).toBe('ACTIVE');
    expect(h.profiles.get(target.id).account_status).toBe('PENDING');
    expect(target.auth_email_confirmed_at).toEqual(new Date('2026-01-01'));
    expect(h.prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'user.verification.approve', actor_user_id: ids.user, entity_id: target.id, before_data: { verification_status: 'PENDING', profile_verification_status: 'PENDING' }, after_data: { verification_status: 'VERIFIED', review_reference: body.review_reference }, request_id: response.body.meta.request_id, correlation_id: 'review-flow' }) });
    expect(h.prisma.activityEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ event_type: 'USER.VERIFICATION_APPROVED', actor_user_id: ids.user, entity_id: target.id }) });
    expect(h.prisma.$queryRaw.mock.calls.some(([sql, id]: any) => sql.join('').includes('FOR UPDATE') && id === target.id)).toBe(true);
    expect(h.issuance.issueForUser).not.toHaveBeenCalled();
  });

  it('forbids self-approval and arbitrary DTO/status/auth/scope writes', async () => {
    h.grant('user.manage');
    await approve(body, ids.user).expect(403);
    for (const data of [{}, { ...body, verification_status: 'VERIFIED' }, { ...body, account_status: 'ACTIVE' }, { ...body, auth_email_confirmed_at: '2026-01-01' }, { ...body, profile: { update: {} } }, { ...body, company_id: ids.companyA }, { ...body, review_reference: 'private@example.test' }]) await approve(data).expect(400);
    await approve(body, target.id, `?company_id=${ids.companyA}`).expect(400);
    expect(approvalWrites()).toHaveLength(0);
  });

  it('requires an expected-state match and an explicit review before overturning a rejection', async () => {
    h.grant('user.manage'); target.verification_status = 'REJECTED';
    await approve().expect(409);
    expect(approvalWrites()).toHaveLength(0);
    await approve({ ...body, expected_status: 'REJECTED' }).expect(200);
    expect(target.verification_status).toBe('VERIFIED');
  });

  it.each([{ account_status: 'DISABLED' }, { account_status: 'LOCKED' }, { account_status: 'PENDING' }, { auth_email_confirmed_at: null }, { auth_email_confirmed_at: new Date('2999-01-01') }, { supabase_user_id: null }])('does not bypass account or auth eligibility %j', async (patch) => {
    h.grant('user.manage'); Object.assign(target, patch);
    await approve().expect(409);
    expect(approvalWrites()).toHaveLength(0);
  });

  it('returns 404 for missing users, 400 for malformed IDs, and 409 for missing profiles', async () => {
    h.grant('user.manage');
    await approve(body, ids.projectB).expect(404);
    await approve(body, 'bad-id').expect(400);
    h.profiles.delete(target.id);
    await approve().expect(409);
    expect(approvalWrites()).toHaveLength(0);
  });

  it('does not duplicate approval mutations/audit/events on a successful retry', async () => {
    h.grant('user.manage');
    await approve().expect(200); await approve().expect(200);
    expect(approvalWrites()).toHaveLength(1);
    expect(h.prisma.auditLog.create.mock.calls.filter(([arg]: any) => arg.data.action === 'user.verification.approve')).toHaveLength(1);
    expect(h.prisma.activityEvent.create.mock.calls.filter(([arg]: any) => arg.data.event_type === 'USER.VERIFICATION_APPROVED')).toHaveLength(1);
  });

  it('keeps approval independent of registration/issuance flags but never bypasses the issuance flag', async () => {
    h.grant('user.manage');
    h.flags.get('ENABLE_RHC_ID')!.enabled = false; h.flags.get('ENABLE_REGISTRATION')!.enabled = false;
    await approve().expect(200);
    h.identity.id = target.supabase_user_id; h.identity.email = target.email;
    const token = await h.signToken({ sub: target.supabase_user_id, email: target.email });
    await request(h.app.getHttpServer()).post('/api/v1/me/rhc-id').set('Authorization', `Bearer ${token}`).send({}).expect(403);
    expect(h.prisma.rhcIdSequence.upsert).not.toHaveBeenCalled();
    h.flags.get('ENABLE_RHC_ID')!.enabled = true;
    const response = await request(h.app.getHttpServer()).post('/api/v1/me/rhc-id').set('Authorization', `Bearer ${token}`).send({}).expect(201);
    expect(response.body.data.rhc_id).toMatch(/^RHC-\d{4}-00000001$/);
    expect(target.verification_status).toBe('VERIFIED');
  });
});
