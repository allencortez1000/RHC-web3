import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { AccountStatus, Prisma, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../platform/prisma.service';
import { requestContext } from '../../platform/request-context.middleware';
import { RhcIdService } from './rhc-id.service';

const now = new Date('2026-06-01T12:00:00.000Z');
const userId = '10000000-0000-4000-8000-000000000001';
const otherUserId = '10000000-0000-4000-8000-000000000002';
type Eligibility = { account_status: AccountStatus; verification_status: VerificationStatus; auth_email_confirmed_at: Date | null };
const eligible: Eligibility = { account_status: AccountStatus.ACTIVE, verification_status: VerificationStatus.VERIFIED, auth_email_confirmed_at: new Date('2026-01-01T00:00:00Z') };
type Profile = { id: string; rhc_id: string | null; rhc_id_issued_at?: Date };

// Serialized fake transactions with rollback. These are NOT live-DB concurrency tests:
// the queue models serialization but cannot validate PostgreSQL row locks or isolation.
function fixture(patch: Partial<Eligibility> = {}, flag: boolean | null = true) {
  const users = new Map<string, Eligibility>([[userId, { ...eligible, ...patch }], [otherUserId, { ...eligible }]]);
  let profiles = new Map<string, Profile>([[userId, { id: 'profile-1', rhc_id: null }], [otherUserId, { id: 'profile-2', rhc_id: null }]]);
  let lastValue = 0;
  let queue: Promise<unknown> = Promise.resolve();
  const events: unknown[] = [];
  const audits: unknown[] = [];
  const commitFailures: string[] = [];
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    featureFlag: { findUnique: jest.fn().mockResolvedValue(flag === null ? null : { enabled: flag }) },
    user: { findUniqueOrThrow: jest.fn(async ({ where }: { where: { id: string } }) => {
      const user = users.get(where.id);
      if (!user) throw new Error('User not found');
      return user;
    }) },
    userProfile: {
      findUniqueOrThrow: jest.fn(async ({ where }: { where: { user_id: string } }) => {
        const profile = profiles.get(where.user_id);
        if (!profile) throw new Error('Profile not found');
        return profile;
      }),
      update: jest.fn(async ({ where, data }: { where: { user_id: string }; data: { rhc_id: string; rhc_id_issued_at: Date } }) => {
        const profile = { ...profiles.get(where.user_id)!, ...data };
        profiles.set(where.user_id, profile);
        return profile;
      }),
    },
    rhcIdSequence: { upsert: jest.fn(async () => ({ year: now.getUTCFullYear(), last_value: ++lastValue })) },
    activityEvent: { create: jest.fn(async ({ data }: { data: unknown }) => { events.push(data); }) },
    auditLog: { create: jest.fn(async ({ data }: { data: unknown }) => { audits.push(data); }) },
  };
  const transaction = jest.fn((callback: (client: typeof tx) => Promise<unknown>) => {
    const result = queue.then(async () => {
      const before = new Map([...profiles].map(([id, profile]) => [id, { ...profile }]));
      const sequenceBefore = lastValue;
      const eventCount = events.length;
      const auditCount = audits.length;
      try {
        const value = await callback(tx);
        const code = commitFailures.shift();
        if (code) throw Object.assign(new Error('Simulated commit failure'), { code });
        return value;
      } catch (error) {
        profiles = before;
        lastValue = sequenceBefore;
        events.length = eventCount;
        audits.length = auditCount;
        throw error;
      }
    });
    queue = result.catch(() => undefined);
    return result;
  });
  const service = new RhcIdService({ $transaction: transaction } as unknown as PrismaService);
  const expectNoIssuance = () => {
    expect(tx.rhcIdSequence.upsert).not.toHaveBeenCalled();
    expect(tx.userProfile.update).not.toHaveBeenCalled();
    expect(tx.activityEvent.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  };
  return { service, tx, transaction, users, events, audits, commitFailures, expectNoIssuance,
    profile: (id = userId) => profiles.get(id)!, sequence: () => lastValue,
    setSequence: (value: number) => { lastValue = value; } };
}

describe('RhcIdService (serialized fake transactions; NOT live database coverage)', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(now); });
  afterEach(() => { jest.useRealTimers(); });

  it.each([
    ['disabled', { account_status: AccountStatus.DISABLED }],
    ['locked', { account_status: AccountStatus.LOCKED }],
    ['pending account', { account_status: AccountStatus.PENDING }],
    ['unconfirmed email', { auth_email_confirmed_at: null }],
    ['future confirmation', { auth_email_confirmed_at: new Date('2027-01-01T00:00:00Z') }],
    ['pending business verification', { verification_status: VerificationStatus.PENDING }],
    ['rejected business verification', { verification_status: VerificationStatus.REJECTED }],
  ] as Array<[string, Partial<Eligibility>]>)('rejects %s without allocating or writing', async (_label, patch) => {
    const f = fixture(patch);
    await expect(f.service.issueForUser(userId)).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.transaction).toHaveBeenCalledTimes(1);
    expect(f.tx.userProfile.findUniqueOrThrow).not.toHaveBeenCalled();
    f.expectNoIssuance();
  });

  it.each([false, null])('fails closed for disabled/missing issuance flag (%s)', async (flag) => {
    const f = fixture({}, flag);
    await expect(f.service.issueForUser(userId)).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.tx.featureFlag.findUnique).toHaveBeenCalledWith({ where: { key: 'ENABLE_RHC_ID' }, select: { enabled: true } });
    expect(f.tx.user.findUniqueOrThrow).not.toHaveBeenCalled();
    f.expectNoIssuance();
  });

  it('allocates the yearly public ID and commits the profile, outbox event, and audit together', async () => {
    const f = fixture();
    const context = { request_id: 'request-1', correlation_id: 'correlation-1' };
    const rhc_id = await requestContext.run(context, () => f.service.issueForUser(userId));
    expect(rhc_id).toBe('RHC-2026-00000001');
    expect(rhc_id).toMatch(/^RHC-\d{4}-\d{8}$/);
    expect(f.profile()).toEqual({ id: 'profile-1', rhc_id, rhc_id_issued_at: now });
    expect(f.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    expect(f.tx.$queryRaw.mock.calls[0]).toEqual([expect.any(Array), userId]);
    expect(f.tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(f.tx.user.findUniqueOrThrow.mock.invocationCallOrder[0]);
    expect(f.tx.rhcIdSequence.upsert).toHaveBeenCalledWith({ where: { year: 2026 }, update: { last_value: { increment: 1 } }, create: { year: 2026, last_value: 1 } });
    expect(f.tx.userProfile.update).toHaveBeenCalledWith({ where: { user_id: userId }, data: { rhc_id, rhc_id_issued_at: now } });
    expect(f.events).toEqual([{ event_type: 'RHC_ID.CREATED', actor_user_id: userId, entity_type: 'user_profile', entity_id: 'profile-1', payload: { rhc_id }, ...context }]);
    expect(f.audits).toEqual([{ action: 'rhc_id.issue', actor_user_id: userId, entity_type: 'user_profile', entity_id: 'profile-1', after_data: { rhc_id }, ...context }]);
  });

  it('returns a previously assigned ID without allocation or duplicate side effects', async () => {
    const f = fixture();
    f.profile().rhc_id = 'RHC-2025-00000123';
    await expect(f.service.issueForUser(userId)).resolves.toBe('RHC-2025-00000123');
    f.expectNoIssuance();
  });

  it('repeated issuance stays idempotent and writes the outbox/audit exactly once', async () => {
    const f = fixture();
    const first = await f.service.issueForUser(userId);
    for (let i = 0; i < 5; i += 1) await expect(f.service.issueForUser(userId)).resolves.toBe(first);
    expect(f.sequence()).toBe(1);
    for (const write of [f.tx.userProfile.update, f.tx.activityEvent.create, f.tx.auditLog.create]) expect(write).toHaveBeenCalledTimes(1);
    expect(f.events).toHaveLength(1);
    expect(f.audits).toHaveLength(1);
  });

  it('does not return an existing ID after the account becomes locked', async () => {
    const f = fixture();
    await f.service.issueForUser(userId);
    f.users.get(userId)!.account_status = AccountStatus.LOCKED;
    await expect(f.service.issueForUser(userId)).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.sequence()).toBe(1);
    expect(f.events).toHaveLength(1);
    expect(f.audits).toHaveLength(1);
  });

  it('concurrent same-user calls converge under the serialized fake transaction', async () => {
    const f = fixture();
    const ids = await Promise.all(Array.from({ length: 12 }, () => f.service.issueForUser(userId)));
    expect(new Set(ids)).toEqual(new Set(['RHC-2026-00000001']));
    expect(f.transaction).toHaveBeenCalledTimes(12);
    expect(f.sequence()).toBe(1);
    for (const write of [f.tx.userProfile.update, f.tx.activityEvent.create, f.tx.auditLog.create]) expect(write).toHaveBeenCalledTimes(1);
    expect(f.events).toHaveLength(1);
    expect(f.audits).toHaveLength(1);
  });

  it('concurrent different-user calls get distinct IDs with one outbox/audit per user in the fake', async () => {
    const f = fixture();
    const ids = await Promise.all([userId, otherUserId, userId, otherUserId].map((id) => f.service.issueForUser(id)));
    expect(ids).toEqual(['RHC-2026-00000001', 'RHC-2026-00000002', 'RHC-2026-00000001', 'RHC-2026-00000002']);
    expect(f.profile(userId).rhc_id).toBe(ids[0]);
    expect(f.profile(otherUserId).rhc_id).toBe(ids[1]);
    expect(f.sequence()).toBe(2);
    for (const write of [f.tx.userProfile.update, f.tx.activityEvent.create, f.tx.auditLog.create]) expect(write).toHaveBeenCalledTimes(2);
    expect(f.events).toHaveLength(2);
    expect(f.audits).toHaveLength(2);
    for (const [index, id] of [userId, otherUserId].entries()) {
      expect(f.events[index]).toMatchObject({ actor_user_id: id, entity_id: `profile-${index + 1}`, payload: { rhc_id: ids[index] } });
      expect(f.audits[index]).toMatchObject({ actor_user_id: id, entity_id: `profile-${index + 1}`, after_data: { rhc_id: ids[index] } });
    }
  });

  it('retries P2034 with rollback and commits only one sequence value, outbox event, and audit', async () => {
    const f = fixture();
    f.commitFailures.push('P2034', 'P2034');
    await expect(f.service.issueForUser(userId)).resolves.toBe('RHC-2026-00000001');
    expect(f.transaction).toHaveBeenCalledTimes(3);
    expect(f.tx.$queryRaw).toHaveBeenCalledTimes(3);
    expect(f.sequence()).toBe(1);
    expect(f.events).toHaveLength(1);
    expect(f.audits).toHaveLength(1);
    await expect(f.service.issueForUser(userId)).resolves.toBe('RHC-2026-00000001');
    expect(f.events).toHaveLength(1);
    expect(f.audits).toHaveLength(1);
  });

  it('fails after three P2034 attempts without committed side effects', async () => {
    const f = fixture();
    f.commitFailures.push('P2034', 'P2034', 'P2034');
    await expect(f.service.issueForUser(userId)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(f.transaction).toHaveBeenCalledTimes(3);
    expect(f.profile().rhc_id).toBeNull();
    expect(f.sequence()).toBe(0);
    expect(f.events).toEqual([]);
    expect(f.audits).toEqual([]);
  });

  it('rolls back a failed audit and does not retry unrelated failures', async () => {
    const f = fixture();
    const error = new Error('Audit unavailable');
    f.tx.auditLog.create.mockRejectedValueOnce(error);
    await expect(f.service.issueForUser(userId)).rejects.toBe(error);
    expect(f.transaction).toHaveBeenCalledTimes(1);
    expect(f.profile().rhc_id).toBeNull();
    expect(f.sequence()).toBe(0);
    expect(f.events).toEqual([]);
    expect(f.audits).toEqual([]);
  });

  it('fails closed on exhausted yearly capacity without issuing a malformed ID', async () => {
    const f = fixture();
    f.setSequence(99999999);
    await expect(f.service.issueForUser(userId)).rejects.toThrow('Digital ID capacity exhausted');
    expect(f.transaction).toHaveBeenCalledTimes(1);
    expect(f.profile().rhc_id).toBeNull();
    expect(f.sequence()).toBe(99999999);
    expect(f.tx.userProfile.update).not.toHaveBeenCalled();
    expect(f.events).toEqual([]);
    expect(f.audits).toEqual([]);
  });
});
