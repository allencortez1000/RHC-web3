import { ConflictException, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AccountStatus, Prisma, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../platform/prisma.service';
import { requestContext } from '../../platform/request-context.middleware';
import { ApplicationUser, ApplicationUserService } from './application-user.service';
import { SupabaseIdentity } from './supabase-jwt.service';

const confirmedAt = '2026-01-01T00:00:00.000Z';
const identity: SupabaseIdentity = { subject: 'auth-user-1', email: 'new@example.test', emailConfirmed: true, emailConfirmedAt: confirmedAt };
const existingUser = (patch: Partial<ApplicationUser> = {}): ApplicationUser => ({
  id: 'user-1', supabase_user_id: identity.subject, email: 'old@example.test',
  account_status: AccountStatus.ACTIVE, verification_status: VerificationStatus.PENDING,
  auth_email_confirmed_at: new Date(confirmedAt), ...patch,
});

// Mock transactions only: snapshots model rollback, not PostgreSQL locking or isolation.
function fixture(initial: ApplicationUser | null = null, registration: boolean | null = true) {
  let user = initial ? { ...initial } : null;
  const events: unknown[] = [];
  const audits: unknown[] = [];
  const commitFailures: string[] = [];
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    $queryRaw: jest.fn().mockResolvedValue([]),
    user: {
      findUnique: jest.fn(async () => user),
      create: jest.fn(async ({ data }: { data: Omit<ApplicationUser, 'id'> }) => {
        user = { id: 'user-1', email: data.email, supabase_user_id: data.supabase_user_id,
          account_status: data.account_status, verification_status: data.verification_status,
          auth_email_confirmed_at: data.auth_email_confirmed_at };
        return user;
      }),
      update: jest.fn(async ({ data }: { data: Partial<ApplicationUser> }) => {
        user = { ...user!, email: data.email!, auth_email_confirmed_at: data.auth_email_confirmed_at! };
        return user;
      }),
    },
    featureFlag: { findUnique: jest.fn().mockResolvedValue(registration === null ? null : { enabled: registration }) },
    activityEvent: { create: jest.fn(async ({ data }: { data: unknown }) => { events.push(data); }) },
    auditLog: { create: jest.fn(async ({ data }: { data: unknown }) => { audits.push(data); }) },
  };
  const transaction = jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => {
    const before = user ? { ...user } : null;
    const eventCount = events.length;
    const auditCount = audits.length;
    try {
      const result = await callback(tx);
      const code = commitFailures.shift();
      if (code) throw Object.assign(new Error('Simulated transaction conflict'), { code });
      return result;
    } catch (error) {
      user = before;
      events.length = eventCount;
      audits.length = auditCount;
      throw error;
    }
  });
  const service = new ApplicationUserService({ $transaction: transaction } as unknown as PrismaService);
  return { service, tx, transaction, events, audits, commitFailures, user: () => user };
}

describe('ApplicationUserService (mocked transactions; no live database)', () => {
  it.each([AccountStatus.DISABLED, AccountStatus.LOCKED])('leaves a %s account entirely immutable', async (account_status) => {
    const original = existingUser({ account_status });
    const f = fixture(original);
    await expect(f.service.provision(identity)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(f.user()).toEqual(original);
    expect(f.tx.user.update).not.toHaveBeenCalled();
    expect(f.tx.user.create).not.toHaveBeenCalled();
    expect(f.tx.featureFlag.findUnique).not.toHaveBeenCalled();
    expect(f.events).toEqual([]);
    expect(f.audits).toEqual([]);
    expect(f.transaction).toHaveBeenCalledTimes(1);
  });

  it.each([
    [AccountStatus.ACTIVE, VerificationStatus.REJECTED],
    [AccountStatus.ACTIVE, VerificationStatus.PENDING],
    [AccountStatus.PENDING, VerificationStatus.PENDING],
    [AccountStatus.ACTIVE, VerificationStatus.VERIFIED],
  ])('does not promote or reset business state %s/%s after email confirmation', async (account_status, verification_status) => {
    const f = fixture(existingUser({ account_status, verification_status, auth_email_confirmed_at: null }));
    await expect(f.service.provision(identity)).resolves.toMatchObject({
      email: identity.email, auth_email_confirmed_at: new Date(confirmedAt), account_status, verification_status,
    });
    expect(f.tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { email: identity.email, auth_email_confirmed_at: new Date(confirmedAt), profile: { upsert: {
        create: { email: identity.email, account_status, verification_status }, update: { email: identity.email },
      } } },
      select: expect.any(Object),
    });
    expect(f.events).toEqual([]);
    expect(f.audits).toEqual([]);
  });

  it.each([null, undefined])('clears a stale confirmation timestamp when Auth returns %s', async (emailConfirmedAt) => {
    const f = fixture(existingUser({ verification_status: VerificationStatus.VERIFIED }));
    await expect(f.service.provision({ ...identity, emailConfirmed: false, emailConfirmedAt })).resolves.toMatchObject({
      auth_email_confirmed_at: null, account_status: AccountStatus.ACTIVE, verification_status: VerificationStatus.VERIFIED,
    });
    expect(f.tx.user.update.mock.calls[0][0].data.auth_email_confirmed_at).toBeNull();
  });

  it.each([
    { emailConfirmed: true, emailConfirmedAt: confirmedAt, account_status: AccountStatus.ACTIVE },
    { emailConfirmed: false, emailConfirmedAt: null, account_status: AccountStatus.PENDING },
  ])('creates a new $account_status user with PENDING business verification', async ({ emailConfirmed, emailConfirmedAt, account_status }) => {
    const f = fixture();
    const context = { request_id: 'request-1', correlation_id: 'correlation-1' };
    const result = await requestContext.run(context, () => f.service.provision({ ...identity, emailConfirmed, emailConfirmedAt }));
    const timestamp = emailConfirmedAt ? new Date(emailConfirmedAt) : null;
    expect(result).toEqual(existingUser({ email: identity.email, account_status, auth_email_confirmed_at: timestamp }));
    expect(f.tx.user.create).toHaveBeenCalledWith({ data: {
      supabase_user_id: identity.subject, email: identity.email, auth_email_confirmed_at: timestamp,
      account_status, verification_status: VerificationStatus.PENDING,
      profile: { create: { email: identity.email, account_status, verification_status: VerificationStatus.PENDING } },
    }, select: expect.any(Object) });
    expect(f.tx.featureFlag.findUnique).toHaveBeenCalledWith({ where: { key: 'ENABLE_REGISTRATION' }, select: { enabled: true } });
    expect(f.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    expect(f.tx.$executeRaw.mock.calls[0]).toEqual([expect.any(Array), identity.subject]);
    expect(f.tx.$queryRaw.mock.calls[0]).toEqual([expect.any(Array), identity.subject]);
    expect(f.tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(f.tx.user.findUnique.mock.invocationCallOrder[0]);
    expect(f.tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(f.tx.user.findUnique.mock.invocationCallOrder[0]);
    expect(f.events).toEqual([{ event_type: 'USER.CREATED', actor_user_id: result.id, entity_type: 'user', entity_id: result.id, payload: {}, ...context }]);
    expect(f.audits).toEqual([{ action: 'user.provision', actor_user_id: result.id, entity_type: 'user', entity_id: result.id, ...context }]);
    await f.service.provision({ ...identity, emailConfirmed, emailConfirmedAt });
    expect(f.tx.user.create).toHaveBeenCalledTimes(1);
    expect(f.tx.activityEvent.create).toHaveBeenCalledTimes(1);
    expect(f.tx.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it.each([false, null])('fails closed for a disabled/missing registration flag (%s)', async (registration) => {
    const f = fixture(null, registration);
    await expect(f.service.provision(identity)).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.user()).toBeNull();
    expect(f.tx.user.create).not.toHaveBeenCalled();
    expect(f.tx.user.update).not.toHaveBeenCalled();
    expect(f.events).toEqual([]);
    expect(f.audits).toEqual([]);
    expect(f.transaction).toHaveBeenCalledTimes(1);
  });

  it('still synchronizes an existing eligible account when registration is off', async () => {
    const f = fixture(existingUser(), false);
    await expect(f.service.provision(identity)).resolves.toMatchObject({ id: 'user-1', email: identity.email });
    expect(f.tx.featureFlag.findUnique).not.toHaveBeenCalled();
    expect(f.tx.user.create).not.toHaveBeenCalled();
  });

  it.each(['P2002', 'P2034'])('re-reads and links the winning row after a %s provisioning race', async (code) => {
    const f = fixture(existingUser());
    f.tx.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(existingUser());
    f.tx.user.create.mockRejectedValueOnce(Object.assign(new Error('Race lost'), { code }));
    await expect(f.service.provision(identity)).resolves.toMatchObject({ id: 'user-1', email: identity.email });
    expect(f.transaction).toHaveBeenCalledTimes(2);
    expect(f.tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(f.tx.user.findUnique).toHaveBeenCalledTimes(2);
    expect(f.tx.user.create).toHaveBeenCalledTimes(1);
    expect(f.tx.user.update).toHaveBeenCalledTimes(1);
    expect(f.events).toEqual([]);
    expect(f.audits).toEqual([]);
  });

  it.each(['P2002', 'P2034'])('rolls back a %s failed commit and persists creation event/audit once on retry', async (code) => {
    const f = fixture();
    f.commitFailures.push(code);
    await expect(f.service.provision(identity)).resolves.toMatchObject({ id: 'user-1' });
    expect(f.transaction).toHaveBeenCalledTimes(2);
    expect(f.tx.user.create).toHaveBeenCalledTimes(2);
    expect(f.events).toHaveLength(1);
    expect(f.audits).toHaveLength(1);
  });

  it.each([
    ['P2002', ConflictException], ['P2034', ServiceUnavailableException],
  ] as const)('bounds %s retries at three attempts with the appropriate public error', async (code, exception) => {
    const f = fixture();
    f.commitFailures.push(code, code, code);
    await expect(f.service.provision(identity)).rejects.toBeInstanceOf(exception);
    expect(f.transaction).toHaveBeenCalledTimes(3);
    expect(f.user()).toBeNull();
    expect(f.events).toEqual([]);
    expect(f.audits).toEqual([]);
  });

  it('rolls back provisioning and does not retry an unrelated audit failure', async () => {
    const f = fixture();
    const error = new Error('Audit unavailable');
    f.tx.auditLog.create.mockRejectedValueOnce(error);
    await expect(f.service.provision(identity)).rejects.toBe(error);
    expect(f.transaction).toHaveBeenCalledTimes(1);
    expect(f.user()).toBeNull();
    expect(f.events).toEqual([]);
    expect(f.audits).toEqual([]);
  });
});
