import { PrismaClient } from '@prisma/client';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { bootstrapAdmin, BootstrapOptions, parseOptions } from '../scripts/bootstrap-admin';

const ids = { user: '10000000-0000-4000-8000-000000000001', subject: '10000000-0000-4000-8000-000000000002', other: '10000000-0000-4000-8000-000000000003', role: '20000000-0000-4000-8000-000000000001' };
describe('live-verified administrator bootstrap', () => {
  const options: BootstrapOptions = { 'supabase-user-id': ids.subject, 'confirm-email': 'admin@example.test', 'confirm-database-host': 'db.example.test', apply: false };
  const apply: BootstrapOptions = { ...options, apply: true, 'confirm-grant': 'GRANT_SUPER_ADMIN' };
  const databaseUrl = 'postgresql://test:test@db.example.test:5432/rhc';
  let server: Server;
  let previous: Record<string, string | undefined>;
  let identity: any;
  let responseStatus: number;
  let received: Array<{ path?: string; authorization?: string }>;
  beforeEach(async () => {
    identity = { id: ids.subject, email: options['confirm-email'], email_confirmed_at: '2026-01-01T00:00:00Z' };
    responseStatus = 200; received = [];
    server = createServer((req, res) => {
      received.push({ path: req.url, authorization: req.headers.authorization });
      res.statusCode = responseStatus;
      res.setHeader('Content-Type', 'application/json');
      if (responseStatus === 302) res.setHeader('Location', '/redirect-must-not-be-followed');
      res.end(JSON.stringify(identity));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    previous = Object.fromEntries(['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'NODE_ENV', 'USE_MOCK_DATA'].map((key) => [key, process.env[key]]));
    Object.assign(process.env, { SUPABASE_URL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, SUPABASE_SECRET_KEY: 'test-only-secret', NODE_ENV: 'test', USE_MOCK_DATA: 'false' });
  });
  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  });

  function fixture() {
    const user: any = { id: ids.user, supabase_user_id: ids.subject, email: options['confirm-email'], account_status: 'ACTIVE', verification_status: 'REJECTED', auth_email_confirmed_at: null, profile: { id: ids.user, account_status: 'PENDING', verification_status: 'VERIFIED' } };
    const users: any[] = [user];
    const grants: any[] = [];
    const tx: any = {
      $executeRaw: jest.fn(),
      user: {
        findUnique: jest.fn(async ({ where }: any) => users.find((value) => where.id ? value.id === where.id : value.supabase_user_id === where.supabase_user_id) ?? null),
        findMany: jest.fn(async ({ where }: any) => users.filter((value) => value.email.toLowerCase() === where.email.equals)),
        create: jest.fn(async ({ data }: any) => { const created = { ...data, id: ids.user, profile: { id: ids.user, ...data.profile.create } }; users.push(created); return created; }),
        update: jest.fn(async ({ where, data }: any) => { const existing = users.find((value) => value.id === where.id); Object.assign(existing, data); return existing; }),
      },
      userProfile: { create: jest.fn(async ({ data }: any) => { const profile = { id: ids.user, ...data }; users.find((value) => value.id === data.user_id).profile = profile; return profile; }) },
      role: { findMany: jest.fn(async () => [{ id: ids.role, role_permissions: ['role.manage', 'user.manage', 'integration.manage', 'feature_flag.manage'].map((code) => ({ permission: { code } })) }]) },
      userRole: { findMany: jest.fn(async () => grants), create: jest.fn(async ({ data }: any) => { const grant = { id: 'grant', expires_at: null, ...data }; grants.push(grant); return grant; }) },
      auditLog: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn(async (callback) => callback(tx)) } as unknown as PrismaClient;
    const expectNoWrites = () => { for (const call of [tx.user.create, tx.user.update, tx.userProfile.create, tx.userRole.create, tx.auditLog.create]) expect(call).not.toHaveBeenCalled(); };
    return { user, users, grants, tx, prisma, expectNoWrites };
  }

  it('requires explicit apply confirmation, with user-id optional and unknown arguments rejected', () => {
    const args = ['--supabase-user-id', ids.subject, '--confirm-email', options['confirm-email'], '--confirm-database-host', options['confirm-database-host']];
    expect(parseOptions(args)).toEqual(options);
    expect(() => parseOptions([...args, '--apply'])).toThrow();
    expect(() => parseOptions([...args, '--unknown', 'x'])).toThrow();
    expect(() => parseOptions([...args, '--supabase-user-id', ids.subject])).toThrow();
    expect(parseOptions([...args, '--apply', '--confirm-grant', 'GRANT_SUPER_ADMIN']).apply).toBe(true);
  });

  it('rejects missing confirmation and host mismatches before any remote or database call', async () => {
    const { prisma } = fixture();
    await expect(bootstrapAdmin(prisma, { ...options, apply: true }, databaseUrl)).rejects.toThrow('Explicit grant confirmation');
    await expect(bootstrapAdmin(prisma, options, 'postgresql://test:test@other.example.test/rhc')).rejects.toThrow('Database host');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(received).toEqual([]);
  });

  it('dry-run performs a real Admin HTTP lookup but no writes', async () => {
    const f = fixture();
    await expect(bootstrapAdmin(f.prisma, options, databaseUrl)).resolves.toEqual({ status: 'dry_run', operation: 'existing_user', would_grant: 'SUPER_ADMIN', user_id: ids.user });
    expect(received).toEqual([{ path: `/auth/v1/admin/users/${ids.subject}`, authorization: 'Bearer test-only-secret' }]);
    f.expectNoWrites();
  });

  it.each([
    { id: ids.other }, { email: 'other@example.test' }, { email_confirmed_at: null, user_metadata: { email_confirmed_at: '2026-01-01T00:00:00Z' } },
    { email_confirmed_at: 'not-a-date' }, { email_confirmed_at: '2999-01-01T00:00:00Z' }, { is_anonymous: true }, { banned_until: '2999-01-01T00:00:00Z' }, { deleted_at: '2026-01-01T00:00:00Z' },
  ])('refuses invalid or ineligible live identity %j, regardless of local business verification', async (patch) => {
    Object.assign(identity, patch);
    const f = fixture(); f.user.verification_status = 'VERIFIED'; f.user.auth_email_confirmed_at = new Date();
    await expect(bootstrapAdmin(f.prisma, apply, databaseUrl)).rejects.toThrow('Live Supabase identity verification failed');
    expect(f.prisma.$transaction).not.toHaveBeenCalled(); f.expectNoWrites();
  });

  it.each([401, 404, 503, 302])('fails closed on HTTP %s, never following redirects with the secret', async (status) => {
    responseStatus = status;
    const f = fixture();
    await expect(bootstrapAdmin(f.prisma, apply, databaseUrl)).rejects.toThrow('Live Supabase identity verification failed');
    expect(received).toHaveLength(1); f.expectNoWrites();
  });

  it('creates an ACTIVE/PENDING user and profile only on apply, without upgrading business verification', async () => {
    const f = fixture(); f.users.length = 0;
    await expect(bootstrapAdmin(f.prisma, options, databaseUrl)).resolves.toMatchObject({ status: 'dry_run', operation: 'create_user' });
    f.expectNoWrites();
    await expect(bootstrapAdmin(f.prisma, apply, databaseUrl)).resolves.toEqual({ status: 'granted', user_id: ids.user });
    expect(f.tx.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: { email: identity.email, supabase_user_id: ids.subject, auth_email_confirmed_at: new Date(identity.email_confirmed_at), account_status: 'ACTIVE', verification_status: 'PENDING', profile: { create: { email: identity.email, account_status: 'ACTIVE', verification_status: 'PENDING' } } } }));
    expect(f.tx.userRole.create).toHaveBeenCalledTimes(1);
    expect(f.tx.auditLog.create.mock.calls.map(([arg]: any) => arg.data.action)).toEqual(['admin.bootstrap.user_create', 'admin.bootstrap']);
  });

  it('never auto-links by email; explicit matching user-id links an unlinked user', async () => {
    const f = fixture(); f.user.supabase_user_id = null;
    await expect(bootstrapAdmin(f.prisma, apply, databaseUrl)).rejects.toThrow('Email collision'); f.expectNoWrites();
    await expect(bootstrapAdmin(f.prisma, { ...options, 'user-id': ids.user }, databaseUrl)).resolves.toMatchObject({ status: 'dry_run', operation: 'link_user' }); f.expectNoWrites();
    await expect(bootstrapAdmin(f.prisma, { ...apply, 'user-id': ids.user }, databaseUrl)).resolves.toMatchObject({ status: 'granted' });
    expect(f.tx.user.update.mock.calls[0][0]).toMatchObject({ where: { id: ids.user, AND: [{ supabase_user_id: null }] }, data: { supabase_user_id: ids.subject, auth_email_confirmed_at: new Date(identity.email_confirmed_at) } });
    expect(f.user.verification_status).toBe('REJECTED');
    expect(f.user.profile).toEqual({ id: ids.user, account_status: 'PENDING', verification_status: 'VERIFIED' });
  });

  it('refuses linking a row bound to another subject, even with explicit user-id and matching email', async () => {
    const f = fixture(); f.user.supabase_user_id = ids.other;
    await expect(bootstrapAdmin(f.prisma, { ...apply, 'user-id': ids.user }, databaseUrl)).rejects.toThrow('Application identity mismatch'); f.expectNoWrites();
  });

  it('refuses a different explicit user when the subject already has an application user', async () => {
    const f = fixture(); f.users.push({ ...f.user, id: ids.other, supabase_user_id: null });
    await expect(bootstrapAdmin(f.prisma, { ...apply, 'user-id': ids.other }, databaseUrl)).rejects.toThrow('already belongs'); f.expectNoWrites();
  });

  it.each(['DISABLED', 'LOCKED'])('never reactivates an existing %s account', async (status) => {
    const f = fixture(); f.user.account_status = status;
    await expect(bootstrapAdmin(f.prisma, apply, databaseUrl)).rejects.toThrow('manual review'); f.expectNoWrites();
  });

  it('preserves pending account and rejected business state when repairing a missing profile', async () => {
    const f = fixture(); f.user.account_status = 'PENDING'; f.user.profile = null;
    await bootstrapAdmin(f.prisma, apply, databaseUrl);
    expect(f.tx.user.update.mock.calls[0][0].data).toEqual({ auth_email_confirmed_at: new Date(identity.email_confirmed_at) });
    expect(f.tx.userProfile.create).toHaveBeenCalledWith({ data: { user_id: ids.user, email: identity.email, account_status: 'PENDING', verification_status: 'REJECTED' } });
    expect(f.user.account_status).toBe('PENDING');
  });

  it('is idempotent, still verifies live, and refuses ambiguous/expiring grants', async () => {
    const f = fixture();
    await bootstrapAdmin(f.prisma, apply, databaseUrl);
    const auditCount = f.tx.auditLog.create.mock.calls.length;
    await expect(bootstrapAdmin(f.prisma, apply, databaseUrl)).resolves.toEqual({ status: 'already_granted', user_id: ids.user });
    expect(f.tx.auditLog.create).toHaveBeenCalledTimes(auditCount);
    expect(f.tx.userRole.create).toHaveBeenCalledTimes(1);
    expect(received).toHaveLength(2);
    expect(JSON.stringify(f.tx.auditLog.create.mock.calls)).not.toMatch(/test-only-secret|admin@example/);
    f.grants[0].expires_at = new Date();
    await expect(bootstrapAdmin(f.prisma, options, databaseUrl)).rejects.toThrow('expiring grant');
    f.grants.push({ expires_at: null });
    await expect(bootstrapAdmin(f.prisma, options, databaseUrl)).rejects.toThrow('Duplicate grants');
  });
});
